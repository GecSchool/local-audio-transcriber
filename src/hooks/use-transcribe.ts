"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

export interface Job {
  jobId: string;
  filename: string;
  status: "pending" | "processing" | "done" | "error";
  text: string | null;
  processingTime: number | null;
  error: string | null;
}

const STORAGE_KEY = "stt_jobs";
type StoredJob = { jobId: string; filename: string };

function loadStored(): StoredJob[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveStored(jobs: StoredJob[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

function mapJobData(data: Record<string, unknown>): Partial<Job> {
  return {
    status: data.status as Job["status"],
    text: (data.text as string) ?? null,
    processingTime: (data.processing_time as number) ?? null,
    error: (data.error as string) ?? null,
  };
}

export function useTranscribe() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const jobsRef = useRef<Job[]>([]);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  async function pollOne(jobId: string, filename: string) {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.status === 404) {
        setJobs((prev) =>
          prev.map((j) =>
            j.jobId === jobId
              ? { ...j, status: "error", error: "서버가 재시작되어 잡이 손실되었습니다." }
              : j
          )
        );
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setJobs((prev) =>
        prev.map((j) => (j.jobId === jobId ? { ...j, ...mapJobData(data) } : j))
      );
      if (data.status === "done" && !notifiedRef.current.has(jobId)) {
        notifiedRef.current.add(jobId);
        toast.success(`변환 완료: ${filename}`);
      } else if (data.status === "error" && !notifiedRef.current.has(jobId)) {
        notifiedRef.current.add(jobId);
        toast.error(`변환 실패: ${filename}`);
      }
    } catch {
      // ignore network errors during polling
    }
  }

  // On mount: recover jobs from localStorage
  useEffect(() => {
    const stored = loadStored();
    if (stored.length === 0) return;

    setJobs(
      stored.map(({ jobId, filename }) => ({
        jobId,
        filename,
        status: "pending",
        text: null,
        processingTime: null,
        error: null,
      }))
    );

    Promise.all(
      stored.map(async ({ jobId }) => {
        try {
          const res = await fetch(`/api/jobs/${jobId}`);
          if (res.status === 404) {
            return { jobId, updates: { status: "error" as const, error: "서버가 재시작되어 잡이 손실되었습니다." } };
          }
          if (!res.ok) return null;
          const data = await res.json();
          return { jobId, updates: mapJobData(data) };
        } catch {
          return null;
        }
      })
    ).then((results) => {
      setJobs((prev) =>
        prev.map((j) => {
          const found = results.find((r) => r?.jobId === j.jobId);
          if (!found) return j;
          const updated = { ...j, ...found.updates };
          // Don't toast for jobs that were already done before browser was closed
          if (updated.status === "done" || updated.status === "error") {
            notifiedRef.current.add(j.jobId);
          }
          return updated;
        })
      );
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling interval for active jobs
  useEffect(() => {
    const interval = setInterval(() => {
      const active = jobsRef.current.filter(
        (j) => j.status === "pending" || j.status === "processing"
      );
      active.forEach((j) => pollOne(j.jobId, j.filename));
    }, 5000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    let res: Response;
    try {
      res = await fetch("/api/transcribe", { method: "POST", body: formData });
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
      return;
    }

    const body = await res.json().catch(() => ({}));

    if (!res.ok || body.error) {
      toast.error(body.error ?? "업로드 실패");
      return;
    }

    const { job_id } = body;
    const newJob: Job = {
      jobId: job_id,
      filename: file.name,
      status: "pending",
      text: null,
      processingTime: null,
      error: null,
    };

    setJobs((prev) => [newJob, ...prev]);
    saveStored([{ jobId: job_id, filename: file.name }, ...loadStored()]);
    pollOne(job_id, file.name);
  }

  function removeJob(jobId: string) {
    setJobs((prev) => prev.filter((j) => j.jobId !== jobId));
    saveStored(loadStored().filter((j) => j.jobId !== jobId));
  }

  function clearDone() {
    const remaining = jobsRef.current.filter(
      (j) => j.status !== "done" && j.status !== "error"
    );
    setJobs(remaining);
    saveStored(remaining.map((j) => ({ jobId: j.jobId, filename: j.filename })));
  }

  return { jobs, submit, removeJob, clearDone };
}
