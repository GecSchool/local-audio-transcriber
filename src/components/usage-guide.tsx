"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { CloudUploadIcon, AiMagicIcon, FileEditIcon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";

const steps = [
  {
    icon: CloudUploadIcon,
    title: "파일 업로드",
    desc: "MP3, WAV, M4A, MP4, WEBM 형식의 오디오 파일을 드래그하거나 클릭해서 업로드하세요.",
  },
  {
    icon: AiMagicIcon,
    title: "자동 변환",
    desc: "업로드 즉시 백그라운드에서 변환을 시작합니다. 여러 파일을 동시에 올릴 수 있습니다.",
  },
  {
    icon: FileEditIcon,
    title: "결과 확인",
    desc: "변환이 완료되면 알림이 표시됩니다. 브라우저를 닫았다 열어도 결과가 유지됩니다.",
  },
  {
    icon: CheckmarkCircle01Icon,
    title: "다운로드",
    desc: "변환된 텍스트를 그대로 복사하거나 .txt 파일로 다운로드할 수 있습니다.",
  },
];

export function UsageGuide() {
  return (
    <section className="w-full max-w-2xl">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
        사용 방법
      </p>
      <div className="grid grid-cols-2 gap-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className="rounded-xl border bg-card p-4 flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
                <HugeiconsIcon icon={step.icon} size={15} className="text-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">0{i + 1}</span>
            </div>
            <p className="text-sm font-semibold">{step.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3 px-1">
        💡 같은 파일을 다시 올리면 캐시에서 즉시 반환됩니다. Apple Silicon에서는 mlx-whisper로 Metal GPU를 활용해 4~6배 빠르게 동작합니다.
      </p>
    </section>
  );
}
