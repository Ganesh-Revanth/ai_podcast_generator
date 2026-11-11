# AI News Podcast Generator

Turn curated news feeds into multi-host or solo podcasts with AI scriptwriting, Edge-TTS voice synthesis, and Apple Podcasts-compatible RSS feeds.

---

## Prerequisites

- **Python 3.9+**
- **Node.js 18+** & **npm**
- **FFmpeg** installed and available in your system `PATH` (used for audio stitching and music mixing)

---

## First-Time Setup

### 1. Configure Environment
Create `backend/.env` from the template:

**Windows (PowerShell):**
```powershell
Copy-Item backend\.env.example backend\.env
```

**macOS / Linux:**
```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and configure your LLM provider:

```env
# Groq (Recommended - Fast & Free tier available)
OPENAI_API_KEY=your_groq_api_key_here
OPENAI_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile

# OR OpenAI
# OPENAI_API_KEY=your_openai_api_key_here
# LLM_MODEL=gpt-4o-mini

# OR Local (Ollama)
# OPENAI_API_KEY=ollama
# OPENAI_BASE_URL=http://localhost:11434/v1
# LLM_MODEL=llama3
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
```

Activate the virtual environment:

- **Windows (PowerShell):**
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
- **Windows (CMD):**
  ```cmd
  venv\Scripts\activate.bat
  ```
- **macOS / Linux:**
  ```bash
  source venv/bin/activate
  ```

Install dependencies and run database migrations:
```bash
pip install -r requirements.txt
alembic upgrade head
```

### 3. Frontend Setup

In a new terminal:
```bash
cd frontend
npm install
```

---

## Running the Application (Normal Run)

Run backend and frontend in separate terminals.

### Terminal 1: Backend

```bash
cd backend
```

Activate virtual environment:
- **Windows (PowerShell):** `.\venv\Scripts\Activate.ps1`
- **macOS / Linux:** `source venv/bin/activate`

Start server:
```bash
uvicorn app.main:app --reload
```
- API: `http://localhost:8000`
- Swagger Docs: `http://localhost:8000/docs`

### Terminal 2: Frontend

```bash
cd frontend
npm run dev
```
- Web UI: `http://localhost:5173`

---

## Running Tests & Checks

### Backend Tests
```bash
cd backend
# With virtual environment activated:
pytest
```

### Frontend Checks
```bash
cd frontend
npm run lint
npm run build
```

---

## URLs & Ports

| Service | URL | Notes |
|---|---|---|
| Frontend Web UI | `http://localhost:5173` | React application |
| Backend API | `http://localhost:8000` | FastAPI server |
| Interactive API Docs | `http://localhost:8000/docs` | Swagger UI |
| Global Podcast RSS Feed | `http://localhost:8000/api/feed.xml` | Apple Podcasts / RSS 2.0 XML |
| Show RSS Feed | `http://localhost:8000/api/shows/{id}/feed.xml` | Per-show podcast feed |

---

## Core Features

- **Monologue & Dialogue Modes:** Single host briefing or dynamic two-host conversational banter with strict turn-based JSON scripting.
- **Audio Synthesis & Mixing:** Edge-TTS multi-voice rendering, 400ms turn pauses, retry backoff, and intro/outro music beds stitched with FFmpeg/pydub.
- **Persistent Bottom Audio Player:** Global player dock with play/pause, scrub slider, skip ±15s, playback speeds (0.75x–2x), countdown sleep timer, and up-next queue.
- **Synchronized Transcript:** Word/sentence timestamp tracking that highlights lines in real time and supports click-to-seek playback.
- **Real-Time Progress (SSE):** Live pipeline stage updates (`fetching` → `ranking` → `scripting` → `voicing` → `mixing` → `done`/`failed`) streamed via Server-Sent Events.
- **Podcast RSS Feeds:** RSS 2.0 and iTunes compliant feeds with `<enclosure>` tags, durations, RFC 822 timestamps, and show notes.
- **Article Extraction & Deduplication:** Full text scraping with Trafilatura, cross-outlet deduplication, and topic clustering.
- **Automated Fact-Checking:** Secondary LLM verification pass checking script claims against original source text.
- **Scheduled Shows:** APScheduler cron/interval automation to generate episodes automatically per show settings.
