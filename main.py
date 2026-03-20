import time
import tempfile
import os

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = WhisperModel("base", device="cpu", compute_type="int8")


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    try:
        start = time.time()

        suffix = os.path.splitext(file.filename)[1] if file.filename else ".tmp"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        try:
            segments, _ = model.transcribe(tmp_path, beam_size=5)
            text = " ".join([s.text for s in segments])
        finally:
            os.unlink(tmp_path)

        return {"text": text.strip(), "processing_time": round(time.time() - start, 2)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
