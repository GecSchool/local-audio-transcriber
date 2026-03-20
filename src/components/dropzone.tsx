"use client";

import { useRef, useState, DragEvent } from "react";
import { Input } from "@/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import { CloudUploadIcon } from "@hugeicons/core-free-icons";

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function Dropzone({ onFileSelect, disabled }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  }

  function handleChange() {
    const file = inputRef.current?.files?.[0];
    if (file) onFileSelect(file);
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors select-none",
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/60",
        disabled ? "pointer-events-none opacity-50" : "",
      ].join(" ")}
    >
      <HugeiconsIcon icon={CloudUploadIcon} size={40} className="text-muted-foreground" />
      <div className="text-center">
        <p className="text-sm font-medium">오디오 파일을 드래그하거나 클릭하여 업로드</p>
        <p className="text-xs text-muted-foreground mt-1">지원 형식: MP3, WAV, M4A, MP4, WEBM</p>
      </div>
      <Input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
