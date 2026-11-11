# AI News Podcast Generator

A full-stack web application that curates news via RSS feeds, uses AI to summarize and generate a podcast script, and converts it to audio using a Text-to-Speech service.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, React Router, Lucide Icons
- **Backend**: Python, FastAPI, SQLAlchemy, Alembic
- **Database**: SQLite (built-in, `backend/ainews.db`, no external database setup required)
- **AI**: OpenAI-compatible client (configurable base URL for compatibility with local LLMs or alternative providers)
- **TTS**: Edge-TTS (free, no API key required)

## Prerequisites
- Node.js & npm (v18+)
- Python 3.9+

## Setup Instructions

### 1. Backend (FastAPI)
Navigate to the `backend` folder and install dependencies:
```bash
cd backend
python -m venv venv
# On Windows
venv\Scripts\activate
# On Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Database migrations with Alembic:
```bash
# Run migrations to initialize or update the SQLite database
alembic upgrade head
```

Create a `.env` file in the `backend` folder (or export the variables). Sample `.env`:
```env
OPENAI_API_KEY=your_api_key_here
# If using a local LLM or another provider like LiteLLM/Ollama:
# OPENAI_BASE_URL=http://localhost:11434/v1
# LLM_MODEL=llama3
```
*Note: If no API key is provided, the AI generation part will fall back to summarizing the news stories directly.*

Run the backend server using Uvicorn:
```bash
uvicorn app.main:app --reload
```
The backend API will be available at `http://localhost:8000`. Swagger docs at `http://localhost:8000/docs`.

### 2. Frontend (React)
Navigate to the `frontend` folder and install dependencies:
```bash
cd frontend
npm install
```

Configure environment (optional, defaults to `http://localhost:8000`):
Create a `.env` file in the `frontend` directory:
```env
VITE_API_URL=http://localhost:8000
```

Start the frontend development server:
```bash
npm run dev
```
The frontend will be available at `http://localhost:5173`.

## Features
- **Monologue & Dialogue Formats**: Choose between a solo news anchor or an engaging two-host conversational discussion with strict JSON dialogue generation.
- **Dual-Host Audio Synthesis & Stitching**: High quality dual voice acting with Edge-TTS, 400ms natural transitions, retry backoff, and intro/outro music branding.
- **Smart News Pipeline**: Full article text extraction with `trafilatura` (with fallback to feed summaries), cross-outlet deduplication of near-identical stories, and topic clustering into distinct episode segments.
- **Automated Fact-Checking & Show Notes**: Secondary LLM fact-checking pass comparing script claims against verified source texts, with interactive Show Notes and fact-check audits on the Player page.
- **Recurring Shows & Automation**: Create automated shows tied to specific news outlets and categories with APScheduler background jobs (daily, hourly, or cron).
- **Target Minutes Pacing**: Dynamically scales story counts and word budgets (~140 WPM) to meet 2 to 20 minute target episode durations.
- **Modern Glassmorphic UI**: Dashboard, Studio Generator, Library Player with live audio playback, and a dedicated Shows management panel.

## Architecture Overview
- **Backend Services**:
  - `news_service.py`: Fetches RSS feeds and extracts full article text via `trafilatura` (with safe fallback).
  - `curation_service.py`: Cross-outlet deduplication and topic clustering to group multi-source stories into cohesive script segments.
  - `ai_service.py`: Generates monologue and strict JSON dialogue scripts with dynamic length budgets, and conducts automated fact-check audits.
  - `tts_service.py`: Converts text to audio via Edge-TTS and stitches dialogue turns and music branding with `pydub`.
  - `scheduler_service.py`: Manages automated episode generation with `APScheduler`.
- **Frontend Layout**: Modern sidebar layout (`App.jsx`) with dynamic glowing backgrounds, glass-morphism panels, and Tailwind animations covering Dashboard, Generator Studio, Shows Automation, and Player Library.
