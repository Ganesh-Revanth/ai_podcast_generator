# AGENTS.md

## Project
AI News Podcast Generator: pulls news (RSS now, more sources later), has an LLM write a podcast script, and turns it into audio with Edge-TTS. The goal is a real, subscribable podcast product, not a read-out tool.

## Stack
- Backend: Python 3.9+, FastAPI, SQLAlchemy 2.x, SQLite (`backend/ainews.db`), Alembic for migrations
- AI: OpenAI-compatible client (`OPENAI_API_KEY`, `OPENAI_BASE_URL`, `LLM_MODEL` in `backend/.env`)
- TTS: edge-tts (free, no key)
- Frontend: React 19, Vite, Tailwind CSS 4, React Router, lucide-react, axios

## Layout
- `backend/app/main.py`: app setup, CORS, static audio mount
- `backend/app/api/endpoints.py`: routes and the generation pipeline
- `backend/app/services/`: `news_service.py` (feeds), `ai_service.py` (scripts), `tts_service.py` (audio)
- `backend/app/db/models.py`, `backend/app/schemas/schemas.py`, `backend/app/core/config.py`
- `frontend/src/pages/`: Dashboard, Generator, Player (Library)
- `frontend/src/services/api.js`: all API calls

## Run
- Backend: `cd backend && uvicorn app.main:app --reload` (port 8000, docs at /docs)
- Frontend: `cd frontend && npm install && npm run dev` (port 5173)
- Lint/build frontend: `npm run lint`, `npm run build`
- Backend tests: `cd backend && pytest` (add tests with every new backend feature)

## Rules
1. **Plan first.** For any change touching more than 3 files, write a short plan and wait for approval before coding.
2. **One milestone at a time.** Don't mix unrelated changes in one task.
3. **Never commit generated files:** `*.db`, `__pycache__/`, `*.pyc`, `backend/app/static/audio/*.mp3`, `.env`, `node_modules/`. Keep `.gitignore` correct.
4. **Never hardcode secrets or URLs.** Use `backend/.env` via `core/config.py`. The frontend reads `VITE_API_URL`.
5. **Database changes go through Alembic migrations.** Never rely on `create_all` for schema changes.
6. **Keep routes thin.** Business logic lives in `services/`. New services get their own file.
7. **Every pipeline stage must report status and store a failure reason** (`status` + `error_message`). Never swallow exceptions silently.
8. **Never spend LLM or TTS calls in loops without limits.** Add caps, timeouts and retries with backoff.
9. **TTS input must be chunked** by paragraph or turn. Never send a whole long script in one call.
10. **Don't delete content in script cleaning blindly** (e.g. text in parentheses). Only strip known stage directions and speaker tags.
11. **Script content must come from the provided sources.** Don't invent facts, quotes or numbers. Always keep source links with the episode.
12. **API changes:** update `schemas.py` and `frontend/src/services/api.js` together, and keep old fields working unless told otherwise.
13. **Frontend style:** reuse the existing glass-panel / Tailwind look. Handle loading, empty and error states on every page. Make layouts responsive and keyboard accessible.
14. **Python style:** type hints, small functions, `logging` instead of `print`. Frontend: functional components and hooks, no new UI library without asking.
15. **Dependencies:** ask before adding one. Pin versions in `requirements.txt` / `package.json`.
16. **Before finishing a task:** run lint/build/tests, start the app, and actually generate one episode end to end. Report what you verified and what you couldn't.
17. **Keep README accurate.** The app uses SQLite, so Docker/PostgreSQL is not required. Update the README when setup or features change.