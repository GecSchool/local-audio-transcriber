# Local Audio Transcriber

강의 녹음 파일을 텍스트로 변환하는 로컬 STT 앱입니다.

클라우드에 오디오를 올리지 않고 내 컴퓨터에서 직접 변환하거나, Groq API를 통해 빠르게 처리할 수 있습니다.

## 만든 이유

강의를 녹음해도 다시 들으려면 시간이 너무 걸리고, 기존 클라우드 STT 서비스는 파일을 외부 서버에 올려야 하는 불편함이 있었습니다. 로컬에서 돌리거나 선택적으로 API를 쓸 수 있는 도구가 필요해서 만들었습니다.

## 기능

- **오디오 전처리**: ffmpeg로 노이즈 제거, 주파수 EQ, 볼륨 정규화 후 Whisper에 전달
- **청크 분할**: 5분 단위로 자동 분할해 긴 파일의 할루시네이션 방지
- **다중 백엔드**: 로컬(faster-whisper / mlx-whisper) 또는 API(Groq / OpenAI) 선택
- **과목/주제 컨텍스트**: 입력한 과목·주제를 Whisper 프롬프트로 활용해 전공 용어 인식률 향상
- **LLM 정리본**: Groq LLaMA 3.3 70B로 마크다운 강의 노트 생성 (원본 텍스트는 그대로 유지)
- **비동기 잡 큐**: 파일 업로드 후 폴링 방식으로 결과 수신, 브라우저 새로고침해도 작업 유지

## 백엔드 선택

| 환경 | 자동 선택 |
|------|----------|
| Apple Silicon Mac + mlx-whisper 설치됨 | mlx-whisper (GPU) |
| 그 외 로컬 | faster-whisper (CPU) |
| `BACKEND=groq` + `GROQ_API_KEY` 설정 | Groq API |
| `BACKEND=openai` + `OPENAI_API_KEY` 설정 | OpenAI API |

## 설치 및 실행

### 사전 요구사항

- Python 3.10+
- Node.js 18+
- ffmpeg (`brew install ffmpeg`)

### 백엔드

```bash
pip install -r requirements.txt

# Apple Silicon이면 mlx-whisper도 설치 (선택)
pip install mlx-whisper

# 환경변수 설정 (API 백엔드 쓸 경우)
cp .env.local.example .env.local
# .env.local에 GROQ_API_KEY 또는 OPENAI_API_KEY 입력

python main.py
```

### 프론트엔드

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 환경변수

`.env.local` 파일에 설정합니다.

```
BACKEND=auto          # auto | groq | openai | local
GROQ_API_KEY=...
OPENAI_API_KEY=...
```

## 사용 방법

1. 오디오 파일을 드래그하거나 클릭해서 업로드
2. 과목과 주제 입력 (선택 — 전공 용어 인식률에 영향을 줌)
3. LLM 정리본이 필요하면 체크 후 변환 시작
4. 완료되면 원본 TXT 또는 마크다운 정리본 MD 다운로드
