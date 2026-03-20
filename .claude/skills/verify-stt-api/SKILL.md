---
name: verify-stt-api
description: Verifies the STT API layer. Use after modifying main.py, route.ts, or requirements.txt. Checks FastAPI CORS, endpoint contract, Next.js proxy bridge, Python dependencies, and port consistency.
---

# STT API Verification

## Purpose

1. **FastAPI CORS Configuration** — Ensures the Python backend allows requests from the Next.js frontend
2. **Transcribe Endpoint Contract** — Validates the POST /transcribe endpoint signature, response shape, and temp file cleanup
3. **API Bridge Proxy** — Confirms the Next.js route correctly proxies to the FastAPI backend with proper error handling
4. **Python Dependencies** — Checks that all required packages are declared in requirements.txt
5. **Port Consistency** — Verifies the backend port matches across main.py and route.ts

## When to Run

- After modifying `main.py` (FastAPI backend)
- After modifying `src/app/api/transcribe/route.ts` (Next.js API bridge)
- After editing `requirements.txt` (Python dependencies)

## Related Files

| File | Purpose |
|------|---------|
| `main.py` | FastAPI backend with /transcribe endpoint and WhisperModel |
| `src/app/api/transcribe/route.ts` | Next.js API route that proxies requests to the Python backend |
| `requirements.txt` | Python package dependencies |

## Workflow

### Step 1: FastAPI CORS Configuration

**Files:** `main.py`

**Check:** CORSMiddleware is registered with `http://localhost:3000` in allow_origins

**Command:**
```bash
grep -n "CORSMiddleware" main.py && grep -n "localhost:3000" main.py
```

**Expected:** Both grep commands produce output showing CORSMiddleware usage and `http://localhost:3000` in the origins list.

**Violation:** No CORSMiddleware import/registration, or `http://localhost:3000` is missing from allow_origins.

**Fix:** Add or update the CORS middleware in `main.py`:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### Step 2: Transcribe Endpoint Contract

**Files:** `main.py`

**Check:** POST /transcribe endpoint exists, accepts `UploadFile = File(...)`, returns `{ text, processing_time }`, and cleans up temp files with `os.unlink` in a `finally` block.

**Command:**
```bash
grep -n 'post("/transcribe")' main.py && grep -n 'UploadFile' main.py && grep -n 'File(\.\.\.)' main.py && grep -n 'os.unlink' main.py && grep -n '"text"' main.py && grep -n '"processing_time"' main.py && grep -n 'finally' main.py
```

**Expected:** All grep commands return matches confirming:
- `@app.post("/transcribe")` decorator
- `file: UploadFile = File(...)` parameter
- `os.unlink` inside a `finally` block
- Return dict containing `"text"` and `"processing_time"` keys

**Violation:** Missing endpoint decorator, incorrect parameter type, missing temp file cleanup, or incomplete response shape.

**Fix:** Ensure the endpoint follows this structure:
```python
@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    try:
        # ... create temp file, run transcription ...
        try:
            segments, _ = model.transcribe(tmp_path, beam_size=5)
            text = " ".join([s.text for s in segments])
        finally:
            os.unlink(tmp_path)
        return {"text": text.strip(), "processing_time": round(time.time() - start, 2)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

### Step 3: API Bridge Proxy

**Files:** `src/app/api/transcribe/route.ts`

**Check:** The Next.js route proxies POST requests to `http://localhost:5000/transcribe`, handles `ECONNREFUSED` errors, and returns structured JSON error responses.

**Command:**
```bash
grep -n 'localhost:5000/transcribe' src/app/api/transcribe/route.ts && grep -n 'ECONNREFUSED' src/app/api/transcribe/route.ts && grep -n 'NextResponse.json' src/app/api/transcribe/route.ts
```

**Expected:** All grep commands return matches confirming:
- Fetch target is `http://localhost:5000/transcribe`
- `ECONNREFUSED` is detected and handled
- Error responses use `NextResponse.json` with `{ error: ... }` shape

**Violation:** Wrong proxy URL, missing ECONNREFUSED handling, or unstructured error responses (e.g., plain text instead of JSON).

**Fix:** Ensure the route includes ECONNREFUSED detection:
```typescript
const isConnRefused = err instanceof Error && err.message.includes("ECONNREFUSED");
if (isConnRefused) {
  return NextResponse.json({ error: "..." }, { status: 503 });
}
```

---

### Step 4: Python Dependencies

**Files:** `requirements.txt`

**Check:** All required packages are listed: `fastapi`, `uvicorn[standard]`, `faster-whisper`, `python-multipart`.

**Command:**
```bash
grep -c 'fastapi' requirements.txt && grep -c 'uvicorn\[standard\]' requirements.txt && grep -c 'faster-whisper' requirements.txt && grep -c 'python-multipart' requirements.txt
```

**Expected:** Each grep returns `1` (or more), confirming all four packages are declared.

**Violation:** Any grep returns `0`, meaning a required package is missing.

**Fix:** Add the missing package to `requirements.txt`. The full required set:
```
fastapi
uvicorn[standard]
faster-whisper
python-multipart
```

---

### Step 5: Port Consistency

**Files:** `main.py`, `src/app/api/transcribe/route.ts`

**Check:** The FastAPI server runs on port 5000, and the Next.js bridge fetches from port 5000.

**Command:**
```bash
grep -n 'port=5000' main.py && grep -n 'localhost:5000' src/app/api/transcribe/route.ts
```

**Expected:** Both grep commands return matches, confirming the port is 5000 in both files.

**Violation:** Port mismatch between the two files, or port not explicitly set.

**Fix:** Ensure `main.py` uses `uvicorn.run(app, host="0.0.0.0", port=5000)` and `route.ts` fetches from `http://localhost:5000/transcribe`.

---

## Output Format

Display results as a table:

```markdown
## STT API Verification Results

| Check | Status | Details |
|-------|--------|---------|
| FastAPI CORS Configuration | PASS / FAIL | {Info} |
| Transcribe Endpoint Contract | PASS / FAIL | {Info} |
| API Bridge Proxy | PASS / FAIL | {Info} |
| Python Dependencies | PASS / FAIL | {Info} |
| Port Consistency | PASS / FAIL | {Info} |
```

## Exceptions

These are NOT violations:

1. **Additional CORS origins** — Origins beyond `http://localhost:3000` (e.g., production domains) are acceptable as long as localhost:3000 is still included
2. **WhisperModel parameters** — Model size (`base`, `small`, `large-v2`, etc.) and `compute_type` (`int8`, `float16`, etc.) may vary per deployment environment
3. **Temporary file suffix logic** — The suffix extraction from `file.filename` may differ based on supported input audio formats

## Related Files

| File | Purpose |
|------|---------|
| `.claude/skills/verify-implementation/SKILL.md` | Unified verification (executes this skill) |
| `.claude/skills/manage-skills/SKILL.md` | Skill maintenance (manages this skill) |
