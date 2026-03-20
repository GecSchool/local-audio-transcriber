"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TranscribeFormProps {
  file: File;
  onSubmit: (subject: string, topic: string, useLlm: boolean) => void;
  onCancel: () => void;
}

export function TranscribeForm({ file, onSubmit, onCancel }: TranscribeFormProps) {
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [useLlm, setUseLlm] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(subject.trim(), topic.trim(), useLlm);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 truncate">
        {file.name}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium w-12 shrink-0">과목</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="예: 운영체제 (선택)"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium w-12 shrink-0">주제</label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="예: 프로세스 스케줄링 (선택)"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={useLlm}
          onChange={(e) => setUseLlm(e.target.checked)}
          className="w-4 h-4 accent-primary"
        />
        <span className="text-sm">LLM으로 텍스트 다듬기</span>
      </label>

      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit">변환 시작</Button>
      </div>
    </form>
  );
}
