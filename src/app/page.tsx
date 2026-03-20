"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/dropzone";
import { JobCard } from "@/components/job-card";
import { SiteHeader } from "@/components/site-header";
import { UsageGuide } from "@/components/usage-guide";
import { TranscribeForm } from "@/components/transcribe-form";
import { useTranscribe } from "@/hooks/use-transcribe";

export default function Home() {
  const { jobs, submit, removeJob, clearDone } = useTranscribe();
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const hasDone = jobs.some((j) => j.status === "done" || j.status === "error");

  function handleFileSelect(file: File) {
    setPendingFile(file);
  }

  function handleFormSubmit(subject: string, topic: string, useLlm: boolean) {
    if (!pendingFile) return;
    submit(pendingFile, subject, topic, useLlm);
    setPendingFile(null);
  }

  function handleFormCancel() {
    setPendingFile(null);
  }

  return (
    <>
      <SiteHeader />
      <main className="flex flex-col items-center p-4 pt-8 pb-16 gap-6">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <h1 className="text-2xl font-bold">음성 텍스트 변환기</h1>
            <p className="text-sm text-muted-foreground">
              오디오 파일을 업로드하면 텍스트로 변환해 드립니다.
            </p>
          </CardHeader>
          <CardContent>
            {pendingFile ? (
              <TranscribeForm
                file={pendingFile}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
              />
            ) : (
              <Dropzone onFileSelect={handleFileSelect} />
            )}
          </CardContent>
        </Card>

        {jobs.length > 0 && (
          <div className="w-full max-w-2xl flex flex-col gap-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-sm text-muted-foreground">작업 {jobs.length}개</span>
              {hasDone && (
                <Button variant="ghost" size="sm" onClick={clearDone}>
                  완료 항목 지우기
                </Button>
              )}
            </div>
            {jobs.map((job) => (
              <JobCard key={job.jobId} job={job} onRemove={() => removeJob(job.jobId)} />
            ))}
          </div>
        )}

        <UsageGuide />
      </main>
    </>
  );
}
