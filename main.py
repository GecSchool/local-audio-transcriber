import asyncio
import glob
import hashlib
import os
import platform
import subprocess
import tempfile
import time
import uuid
from concurrent.futures import ThreadPoolExecutor

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

load_dotenv(".env.local")

# ── ffmpeg 가용성 체크 ──────────────────────────────────────────────────────

def _check_ffmpeg() -> bool:
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

HAS_FFMPEG = _check_ffmpeg()
print(f"[STT] ffmpeg: {'available' if HAS_FFMPEG else 'not found (preprocessing skipped)'}")

# ── 백엔드 선택 ────────────────────────────────────────────────────────────

def _detect_local_backend() -> str:
    """Apple Silicon + mlx_whisper 설치 여부에 따라 mlx 또는 faster-whisper 반환."""
    if platform.system() == "Darwin":
        try:
            chip = subprocess.check_output(
                ["sysctl", "-n", "machdep.cpu.brand_string"],
                stderr=subprocess.DEVNULL,
            ).decode().strip()
            if "Apple" in chip:
                try:
                    import mlx_whisper  # noqa: F401
                    return "mlx"
                except ImportError:
                    pass
        except Exception:
            pass
    return "faster-whisper"


_BACKEND_ENV = os.getenv("BACKEND", "auto").lower()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

if _BACKEND_ENV == "groq":
    if not GROQ_API_KEY:
        print("[STT] WARNING: BACKEND=groq 이지만 GROQ_API_KEY 미설정 → 로컬로 폴백")
        BACKEND = _detect_local_backend()
    else:
        BACKEND = "groq"
elif _BACKEND_ENV == "openai":
    if not OPENAI_API_KEY:
        print("[STT] WARNING: BACKEND=openai 이지만 OPENAI_API_KEY 미설정 → 로컬로 폴백")
        BACKEND = _detect_local_backend()
    else:
        BACKEND = "openai"
elif _BACKEND_ENV == "local":
    BACKEND = _detect_local_backend()
else:  # auto
    BACKEND = _detect_local_backend()

# ── 로컬 모델 초기화 (로컬 백엔드일 때만) ──────────────────────────────────

MODEL_NAME = "base"

if BACKEND == "faster-whisper":
    from faster_whisper import WhisperModel
    _fw_model = WhisperModel(MODEL_NAME, device="cpu", compute_type="int8")

# ── API 클라이언트 초기화 ───────────────────────────────────────────────────

if BACKEND == "groq":
    from groq import Groq
    _groq_client = Groq(api_key=GROQ_API_KEY)

if BACKEND == "openai":
    from openai import OpenAI
    _openai_client = OpenAI(api_key=OPENAI_API_KEY)

print(f"[STT] Backend: {BACKEND}" + (f" | Model: {MODEL_NAME}" if BACKEND in ("mlx", "faster-whisper") else ""))

# ── FastAPI 앱 ─────────────────────────────────────────────────────────────

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_jobs: dict[str, dict] = {}
_cache: dict[str, dict] = {}
_sem = asyncio.Semaphore(1 if BACKEND in ("mlx", "faster-whisper") else 5)  # 로컬: GPU 직렬화 / API: 최대 5개 병렬
_executor = ThreadPoolExecutor(max_workers=1)

# ── 전처리 함수 ────────────────────────────────────────────────────────────

def _preprocess_audio(input_path: str) -> str:
    """전처리된 WAV 파일 경로 반환. ffmpeg 없으면 원본 경로 반환."""
    if not HAS_FFMPEG:
        return input_path
    out_path = input_path + "_preprocessed.wav"
    subprocess.run([
        "ffmpeg", "-y", "-i", input_path,
        "-af", "highpass=f=80,lowpass=f=8000,equalizer=f=2500:width_type=o:width=2:g=3,afftdn=nf=-25,dynaudnorm=g=15:f=250:r=0.9",
        "-ar", "16000", "-ac", "1",
        out_path
    ], capture_output=True, check=True)
    return out_path


def _split_chunks(audio_path: str, chunk_sec: int = 300) -> list[str]:
    """WAV → chunk_000.wav, chunk_001.wav, ... 반환. ffmpeg 없으면 원본 1개 반환."""
    if not HAS_FFMPEG:
        return [audio_path]
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", audio_path],
        capture_output=True, text=True
    )
    duration = float(probe.stdout.strip() or "0")
    if duration <= chunk_sec:
        return [audio_path]

    chunk_pattern = audio_path + "_chunk_%03d.wav"
    subprocess.run([
        "ffmpeg", "-y", "-i", audio_path,
        "-f", "segment", "-segment_time", str(chunk_sec),
        "-reset_timestamps", "1", chunk_pattern
    ], capture_output=True, check=True)
    chunks = sorted(glob.glob(audio_path + "_chunk_*.wav"))
    return chunks if chunks else [audio_path]

# ── 변환 함수 ──────────────────────────────────────────────────────────────

def _run_transcribe(tmp_path: str, filename: str, prompt: str = "") -> str:
    if BACKEND == "groq":
        with open(tmp_path, "rb") as f:
            transcription = _groq_client.audio.transcriptions.create(
                file=(filename, f),
                model="whisper-large-v3",
                language="ko",
                response_format="text",
                prompt=prompt or None,
            )
        return transcription  # response_format="text" → str 반환

    if BACKEND == "openai":
        with open(tmp_path, "rb") as f:
            transcription = _openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                language="ko",
                prompt=prompt or None,
            )
        return transcription.text

    if BACKEND == "mlx":
        import mlx_whisper
        result = mlx_whisper.transcribe(
            tmp_path,
            path_or_hf_repo=f"mlx-community/whisper-{MODEL_NAME}-mlx",
            language="ko",
            condition_on_previous_text=False,
            initial_prompt=prompt or None,
        )
        return result["text"]

    # faster-whisper
    segments, _ = _fw_model.transcribe(
        tmp_path,
        beam_size=5,
        language="ko",
        condition_on_previous_text=False,
        initial_prompt=prompt or None,
    )
    return " ".join([s.text for s in segments])


def _llm_summarize(text: str, subject: str, topic: str) -> str:
    """원본 텍스트를 건드리지 않고 마크다운 정리본 생성."""
    if not GROQ_API_KEY:
        return ""
    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)
    context = f"{subject} {topic}".strip()
    system = (
        "당신은 한국어 강의 전사 텍스트를 마크다운 강의 노트로 정리하는 전문가입니다. "
        "전사 텍스트에 실제로 언급된 내용만 사용하고 내용을 추가로 만들지 마세요. "
        "제목, 소제목, 핵심 개념, 중요 포인트를 마크다운 형식으로 구조화하세요."
    )
    user = f"{'과목/주제: ' + context + chr(10) if context else ''}다음 강의 전사 텍스트를 마크다운 강의 노트로 정리해주세요:\n\n{text}"
    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "system", "content": system},
                  {"role": "user", "content": user}],
        temperature=0.2,
    )
    return resp.choices[0].message.content.strip()


def _run_pipeline(tmp_path: str, filename: str, subject: str, topic: str, use_llm: bool) -> tuple[str, str]:
    """(원본 전사 텍스트, 정리본 마크다운) 반환. use_llm=False면 정리본은 빈 문자열."""
    prompt = " ".join(filter(None, [subject, topic, "강의"])).strip()
    print(f"[STT] prompt: {prompt!r} | use_llm: {use_llm}")

    extra_files: list[str] = []
    try:
        preprocessed_path = _preprocess_audio(tmp_path)
        if preprocessed_path != tmp_path:
            extra_files.append(preprocessed_path)

        chunks = _split_chunks(preprocessed_path)
        for chunk in chunks:
            if chunk != preprocessed_path and chunk != tmp_path:
                extra_files.append(chunk)

        print(f"[STT] chunks: {len(chunks)}")
        texts = [_run_transcribe(chunk, filename, prompt) for chunk in chunks]
        text = " ".join(texts).strip()

        summary = ""
        if use_llm:
            print("[STT] LLM 정리본 생성 시작")
            summary = _llm_summarize(text, subject, topic)

        return text, summary
    finally:
        for f in extra_files:
            try:
                os.unlink(f)
            except Exception:
                pass


async def _process_job(
    job_id: str,
    tmp_path: str,
    cache_key: str,
    filename: str,
    subject: str,
    topic: str,
    use_llm: bool,
) -> None:
    async with _sem:
        _jobs[job_id]["status"] = "processing"
        start = time.time()
        try:
            loop = asyncio.get_event_loop()
            text, summary = await loop.run_in_executor(
                _executor, _run_pipeline, tmp_path, filename, subject, topic, use_llm
            )
            processing_time = round(time.time() - start, 2)
            _jobs[job_id].update({
                "status": "done",
                "text": text,
                "summary": summary,
                "processing_time": processing_time,
            })
            _cache[cache_key] = {"text": text, "summary": summary, "processing_time": processing_time}
        except Exception as e:
            import traceback
            traceback.print_exc()
            _jobs[job_id].update({"status": "error", "error": str(e)})
        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

# ── 엔드포인트 ─────────────────────────────────────────────────────────────

@app.post("/debug/preprocess")
async def debug_preprocess(file: UploadFile = File(...)):
    """전처리된 WAV 파일을 바로 다운로드. ffmpeg 테스트용."""
    if not HAS_FFMPEG:
        raise HTTPException(status_code=503, detail="ffmpeg이 설치되어 있지 않습니다.")
    content = await file.read()
    filename = file.filename or "input"
    suffix = os.path.splitext(filename)[1] if "." in filename else ".tmp"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(content)
    tmp.close()
    try:
        out_path = _preprocess_audio(tmp.name)
    except subprocess.CalledProcessError as e:
        os.unlink(tmp.name)
        raise HTTPException(status_code=500, detail=f"ffmpeg 실패: {e.stderr.decode(errors='ignore')}")
    os.unlink(tmp.name)
    stem = os.path.splitext(filename)[0]
    return FileResponse(
        out_path,
        media_type="audio/wav",
        filename=f"{stem}_preprocessed.wav",
        background=BackgroundTask(os.unlink, out_path),
    )


@app.get("/config")
async def get_config():
    return {
        "backend": BACKEND,
        "model": MODEL_NAME if BACKEND in ("mlx", "faster-whisper") else "whisper-large-v3" if BACKEND == "groq" else "whisper-1",
    }


@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    subject: str = Form(""),
    topic: str = Form(""),
    use_llm: str = Form("false"),
):
    use_llm_bool = use_llm.lower() == "true"
    content = await file.read()
    cache_key = hashlib.sha256(
        content + subject.encode() + topic.encode() + str(use_llm_bool).encode()
    ).hexdigest()
    job_id = str(uuid.uuid4())
    filename = file.filename or "unknown"

    if cache_key in _cache:
        cached = _cache[cache_key]
        _jobs[job_id] = {
            "status": "done",
            "filename": filename,
            "text": cached["text"],
            "summary": cached.get("summary", ""),
            "processing_time": cached["processing_time"],
            "error": None,
            "created_at": time.time(),
        }
        return {"job_id": job_id}

    suffix = os.path.splitext(filename)[1] if "." in filename else ".tmp"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(content)
    tmp.close()

    _jobs[job_id] = {
        "status": "pending",
        "filename": filename,
        "text": None,
        "summary": None,
        "processing_time": None,
        "error": None,
        "created_at": time.time(),
    }

    asyncio.create_task(
        _process_job(job_id, tmp.name, cache_key, filename, subject, topic, use_llm_bool)
    )
    return {"job_id": job_id}


@app.get("/jobs/{job_id}")
async def get_job(job_id: str):
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return _jobs[job_id]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
