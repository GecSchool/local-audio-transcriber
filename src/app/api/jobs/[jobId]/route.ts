import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    const response = await fetch(`http://localhost:8000/jobs/${jobId}`);

    if (response.status === 404) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (!response.ok) {
      return NextResponse.json({ error: "서버 오류" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const isConnRefused = err instanceof Error && err.message.includes("ECONNREFUSED");
    return NextResponse.json(
      { error: isConnRefused ? "STT 서버에 연결할 수 없습니다." : "오류가 발생했습니다." },
      { status: 503 }
    );
  }
}
