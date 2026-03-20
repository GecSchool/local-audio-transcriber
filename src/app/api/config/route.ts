import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("http://localhost:8000/config");
    if (!response.ok) {
      return NextResponse.json({ error: "서버 오류" }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const isConnRefused = err instanceof Error && err.message.includes("ECONNREFUSED");
    return NextResponse.json(
      { error: isConnRefused ? "disconnected" : "오류" },
      { status: 503 }
    );
  }
}
