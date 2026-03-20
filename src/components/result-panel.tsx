"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon } from "@hugeicons/core-free-icons";

interface ResultPanelProps {
  text: string;
  processingTime: number | null;
}

export function ResultPanel({ text, processingTime }: ResultPanelProps) {
  function handleDownload() {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcription.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">변환 결과</p>
        {processingTime !== null && (
          <span className="text-xs text-muted-foreground">처리 시간: {processingTime}초</span>
        )}
      </div>
      <Textarea
        readOnly
        value={text}
        className="min-h-[200px] resize-none"
        placeholder="변환된 텍스트가 여기에 표시됩니다."
      />
      <Button variant="outline" onClick={handleDownload} className="self-end gap-2">
        <HugeiconsIcon icon={Download01Icon} size={16} />
        결과 다운로드
      </Button>
    </div>
  );
}
