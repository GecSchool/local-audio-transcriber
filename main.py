import asyncio
import hashlib
import os
import platform
import subprocess
import tempfile
import time
import uuid
from concurrent.futures import ThreadPoolExecutor

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(".env.local")

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
_sem = asyncio.Semaphore(1)  # 로컬: GPU 직렬화 / API: 동시 요청 제한
_executor = ThreadPoolExecutor(max_workers=1)

# ── 변환 함수 ──────────────────────────────────────────────────────────────

def _run_transcribe(tmp_path: str, filename: str) -> str:
    if BACKEND == "groq":
        with open(tmp_path, "rb") as f:
            transcription = _groq_client.audio.transcriptions.create(
                file=(filename, f),
                model="whisper-large-v3",
                language="ko",
                response_format="text",
            )
        return transcription  # response_format="text" → str 반환

    if BACKEND == "openai":
        with open(tmp_path, "rb") as f:
            transcription = _openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                language="ko",
            )
        return transcription.text

    if BACKEND == "mlx":
        import mlx_whisper
        result = mlx_whisper.transcribe(
            tmp_path,
            path_or_hf_repo=f"mlx-community/whisper-{MODEL_NAME}-mlx",
            language="ko",
            condition_on_previous_text=False,
        )
        return result["text"]

    # faster-whisper
    segments, _ = _fw_model.transcribe(
        tmp_path,
        beam_size=5,
        language="ko",
        condition_on_previous_text=False,
    )
    return " ".join([s.text for s in segments])


async def _process_job(job_id: str, tmp_path: str, file_hash: str, filename: str) -> None:
    async with _sem:
        _jobs[job_id]["status"] = "processing"
        start = time.time()
        try:
            loop = asyncio.get_event_loop()
            text = await loop.run_in_executor(
                _executor, _run_transcribe, tmp_path, filename
            )
            processing_time = round(time.time() - start, 2)
            text = text.strip()
            _jobs[job_id].update({
                "status": "done",
                "text": text,
                "processing_time": processing_time,
            })
            _cache[file_hash] = {"text": text, "processing_time": processing_time}
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

@app.get("/config")
async def get_config():
    return {
        "backend": BACKEND,
        "model": MODEL_NAME if BACKEND in ("mlx", "faster-whisper") else "whisper-large-v3" if BACKEND == "groq" else "whisper-1",
    }


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    content = await file.read()
    file_hash = hashlib.sha256(content).hexdigest()
    job_id = str(uuid.uuid4())
    filename = file.filename or "unknown"

    if file_hash in _cache:
        cached = _cache[file_hash]
        _jobs[job_id] = {
            "status": "done",
            "filename": filename,
            "text": cached["text"],
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
        "processing_time": None,
        "error": None,
        "created_at": time.time(),
    }

    asyncio.create_task(_process_job(job_id, tmp.name, file_hash, filename))
    return {"job_id": job_id}


@app.get("/jobs/{job_id}")
async def get_job(job_id: str):
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return _jobs[job_id]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
