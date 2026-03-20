"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dropzone } from "@/components/dropzone";
import { ResultPanel } from "@/components/result-panel";
import { useTranscribe } from "@/hooks/use-transcribe";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { status, progress, result, processingTime, transcribe, reset } = useTranscribe();

  const isIdle = status === "idle" || status === "error";
  const isProcessing = status === "uploading" || status === "processing";
  const isDone = status === "done";

  function handleFileSelect(file: File) {
    setSelectedFile(file);
  }

  async function handleTranscribe() {
    if (!selectedFile) return;
    await transcribe(selectedFile);
  }

  function handleReset() {
    setSelectedFile(null);
    reset();
  }

  function getStatusText() {
    if (status === "uploading") return "업로드 중...";
    if (status === "processing") return "텍스트 변환 중...";
    return "";
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <h1 className="text-2xl font-bold">음성 텍스트 변환기</h1>
          <p className="text-sm text-muted-foreground">
            오디오 파일을 업로드하면 텍스트로 변환해 드립니다.
          </p>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {isIdle && (
            <Dropzone
              onFileSelect={handleFileSelect}
              disabled={isProcessing}
            />
          )}

          {selectedFile && isIdle && (
            <p className="text-sm text-muted-foreground text-center">
              선택된 파일: <span className="font-medium text-foreground">{selectedFile.name}</span>
            </p>
          )}

          {isProcessing && (
            <div className="flex flex-col gap-3">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">{getStatusText()}</p>
            </div>
          )}

          {isDone && result !== null && (
            <>
              <Separator />
              <ResultPanel text={result} processingTime={processingTime} />
            </>
          )}
        </CardContent>

        <CardFooter className="flex gap-2 justify-end">
          {isDone ? (
            <Button variant="outline" onClick={handleReset}>
              초기화
            </Button>
          ) : (
            <Button
              onClick={handleTranscribe}
              disabled={!selectedFile || isProcessing}
            >
              변환 시작
            </Button>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}
