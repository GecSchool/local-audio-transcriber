"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiMicIcon } from "@hugeicons/core-free-icons";

interface Config {
  backend: string;
  model: string;
}

const BACKEND_LABEL: Record<string, string> = {
  groq: "Groq API",
  openai: "OpenAI API",
  mlx: "Local MLX",
  "faster-whisper": "Local CPU",
};

const BACKEND_COLOR: Record<string, string> = {
  groq: "text-green-500",
  openai: "text-green-500",
  mlx: "text-blue-500",
  "faster-whisper": "text-blue-500",
};

export function SiteHeader() {
  const [config, setConfig] = useState<Config | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setConnected(false);
        } else {
          setConfig(data);
          setConnected(true);
        }
      })
      .catch(() => setConnected(false));
  }, []);

  return (
    <header className="w-full border-b bg-background/95 backdrop-blur sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
        <HugeiconsIcon icon={AiMicIcon} size={22} className="text-primary" />
        <span className="font-semibold text-base tracking-tight">Local STT</span>

        <div className="ml-auto flex items-center gap-2">
          {connected === null && (
            <span className="text-xs text-muted-foreground">연결 중...</span>
          )}
          {connected === false && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">서버 끊김</span>
            </div>
          )}
          {connected === true && config && (
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${BACKEND_COLOR[config.backend] ?? "bg-gray-400"} opacity-90`} />
              <span className="text-xs text-muted-foreground">
                {BACKEND_LABEL[config.backend] ?? config.backend}
              </span>
              <span className="text-xs text-muted-foreground/50">·</span>
              <span className="text-xs text-muted-foreground">{config.model}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
