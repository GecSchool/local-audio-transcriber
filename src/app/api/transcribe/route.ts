import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const response = await fetch("http://localhost:8000/transcribe", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "알 수 없는 오류" }));
      return NextResponse.json(
        { error: error.detail ?? "STT 서버 오류가 발생했습니다." },
        { status: response.status }
      );
    }

    const data = await response.json(); // { job_id }
    return NextResponse.json(data);
  } catch (err: unknown) {
    const isConnRefused =
      err instanceof Error && err.message.includes("ECONNREFUSED");

    if (isConnRefused) {
      return NextResponse.json(
        { error: "STT 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "STT 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요." },
      { status: 503 }
    );
  }
}
