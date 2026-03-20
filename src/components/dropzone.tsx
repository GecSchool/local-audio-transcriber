"use client";

import { useId, useState, DragEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CloudUploadIcon } from "@hugeicons/core-free-icons";

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function Dropzone({ onFileSelect, disabled }: DropzoneProps) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);

  function handleDragOver(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  }

  return (
    <label
      htmlFor={inputId}
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
      <input
        id={inputId}
        type="file"
        accept="audio/*,video/*"
        className="sr-only"
        onChange={handleChange}
        disabled={disabled}
      />
    </label>
  );
}
