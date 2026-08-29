# AI News Podcast Generator

A full-stack web application that curates news via RSS feeds, uses AI to summarize and generate a podcast script, and converts it to audio using a Text-to-Speech service.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, React Router, Lucide Icons
- **Backend**: Python, FastAPI, SQLAlchemy
- **Database**: SQLite (built-in, no setup required)
- **AI**: OpenAI (configurable base URL for compatibility with local LLMs)
- **TTS**: Edge-TTS (free, no API key required)

## Prerequisites
- Node.js & npm
- Python 3.9+
- Docker & Docker Compose (for PostgreSQL)

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

Create a `.env` file in the `backend` folder (or just export the variables). Sample `.env`:
```env
OPENAI_API_KEY=your_api_key_here
# If using a local LLM or another provider like LiteLLM:
# OPENAI_BASE_URL=http://localhost:11434/v1
# LLM_MODEL=llama3
```
*Note: If no API key is provided, the AI generation part will fail unless using a local model.*

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

Start the frontend development server:
```bash
npm run dev
```
The frontend will be available at `http://localhost:5173`.

## Architecture Overview
- **Backend Services**: Located in `backend/app/services`. `news_service.py` handles fetching RSS feeds. `ai_service.py` talks to the LLM to write the podcast script. `tts_service.py` converts the text to a `.mp3` using Microsoft Edge's free TTS engine.
- **Frontend Layout**: The UI uses a modern sidebar layout with dynamic glowing backgrounds, glass-morphism panels, and Tailwind animations to feel premium and responsive.
