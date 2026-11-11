from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.api import endpoints
from app.core.config import settings
from app.db.session import engine, SessionLocal
from app.db import models
from app.services.scheduler_service import start_scheduler, stop_scheduler, sync_all_show_jobs

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: start scheduler and register active show jobs
    start_scheduler()
    db = SessionLocal()
    try:
        sync_all_show_jobs(db)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error syncing show jobs on startup: {e}")
    finally:
        db.close()
    yield
    # Shutdown
    stop_scheduler()

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static audio files
app.mount("/static/audio", StaticFiles(directory=settings.AUDIO_STORAGE_DIR), name="audio")

# Include routers
app.include_router(endpoints.router, prefix="/api", tags=["api"])

@app.get("/")
def read_root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}
