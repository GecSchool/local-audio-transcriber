"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";

interface TranscribeState {
  status: "idle" | "uploading" | "processing" | "done" | "error";
  progress: number;
  result: string | null;
  processingTime: number | null;
  error: string | null;
}

const initialState: TranscribeState = {
  status: "idle",
  progress: 0,
  result: null,
  processingTime: null,
  error: null,
};

export function useTranscribe() {
  const [state, setState] = useState<TranscribeState>(initialState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearProgressInterval() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  async function transcribe(file: File): Promise<void> {
    setState({ ...initialState, status: "uploading", progress: 0 });

    // Simulate upload progress 0 → 40
    let uploadProgress = 0;
    intervalRef.current = setInterval(() => {
      uploadProgress = Math.min(uploadProgress + 4, 38);
      setState((prev) => ({ ...prev, progress: uploadProgress }));
    }, 100);

    const formData = new FormData();
    formData.append("file", file);

    let response: Response;
    try {
      response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
    } catch {
      clearProgressInterval();
      const errorMsg = "네트워크 오류가 발생했습니다.";
      setState({ ...initialState, status: "error", error: errorMsg });
      toast.error(errorMsg);
      return;
    }

    clearProgressInterval();

    // Transition to processing: progress 40 → 90
    setState((prev) => ({ ...prev, status: "processing", progress: 40 }));

    let processingProgress = 40;
    intervalRef.current = setInterval(() => {
      processingProgress = Math.min(processingProgress + 2, 90);
      setState((prev) => ({ ...prev, progress: processingProgress }));
    }, 200);

    const data = await response.json();
    clearProgressInterval();

    if (!response.ok || data.error) {
      const errorMsg = data.error ?? "변환 중 오류가 발생했습니다.";
      setState({ ...initialState, status: "error", error: errorMsg });
      toast.error(errorMsg);
      return;
    }

    setState({
      status: "done",
      progress: 100,
      result: data.text,
      processingTime: data.processing_time,
      error: null,
    });
  }

  function reset() {
    clearProgressInterval();
    setState(initialState);
  }

  return { ...state, transcribe, reset };
}
