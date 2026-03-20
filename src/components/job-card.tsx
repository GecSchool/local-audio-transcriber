"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import type { Job } from "@/hooks/use-transcribe";

interface JobCardProps {
  job: Job;
  onRemove: () => void;
}

function StatusBadge({ status }: { status: Job["status"] }) {
  const styles: Record<Job["status"], string> = {
    pending: "text-muted-foreground",
    processing: "text-blue-500",
    done: "text-green-600",
    error: "text-red-500",
  };
  const labels: Record<Job["status"], string> = {
    pending: "대기 중",
    processing: "변환 중...",
    done: "완료",
    error: "오류",
  };
  return (
    <span className={`text-xs font-medium shrink-0 ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export function JobCard({ job, onRemove }: JobCardProps) {
  function handleDownload() {
    if (!job.text) return;
    const blob = new Blob([job.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = job.filename.replace(/\.[^.]+$/, "") + "_transcript.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium truncate">{job.filename}</span>
            <StatusBadge status={job.status} />
            {job.processingTime !== null && (
              <span className="text-xs text-muted-foreground shrink-0">
                {job.processingTime}초
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-7 w-7"
            onClick={onRemove}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} />
          </Button>
        </div>

        {job.status === "processing" && (
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full w-1/2 bg-blue-500 animate-pulse rounded-full" />
          </div>
        )}

        {job.status === "done" && job.text !== null && (
          <div className="flex flex-col gap-2">
            <Textarea
              readOnly
              value={job.text}
              className="min-h-[120px] resize-none text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="self-end gap-2"
            >
              <HugeiconsIcon icon={Download01Icon} size={14} />
              다운로드
            </Button>
          </div>
        )}

        {job.status === "error" && (
          <p className="text-sm text-red-500">
            {job.error ?? "변환 중 오류가 발생했습니다."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
