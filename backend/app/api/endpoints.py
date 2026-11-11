import datetime
import logging
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db, SessionLocal
from app.db import models
from app.schemas import schemas
from app.services.news_service import fetch_and_store_news, get_available_sources, fetch_articles_from_source, NEWS_SOURCES
from app.services.ai_service import generate_podcast_script, generate_podcast_script_from_text
from app.services.tts_service import generate_audio_from_script, VOICE_OPTIONS

logger = logging.getLogger(__name__)

router = APIRouter()

def news_fetch_pipeline():
    db = SessionLocal()
    try:
        fetch_and_store_news(db)
    finally:
        db.close()

@router.get("/news/sources", response_model=List[schemas.NewsSource])
def get_news_sources():
    """Retrieve available news outlets (The Hindu, NDTV, TOI, etc.) and their categories."""
    return get_available_sources()

@router.get("/voices", response_model=List[schemas.VoiceOption])
def get_voices():
    """Retrieve available TTS voice options."""
    return VOICE_OPTIONS

@router.post("/news/fetch", response_model=dict)
def trigger_news_fetch(background_tasks: BackgroundTasks):
    """Triggers a background task to fetch the latest news from feeds."""
    background_tasks.add_task(news_fetch_pipeline)
    return {"message": "News fetching started in the background."}

@router.get("/news", response_model=List[schemas.Article])
def get_news(db: Session = Depends(get_db), category: str = None, skip: int = 0, limit: int = 100):
    """Retrieve articles, optionally filtered by category."""
    query = db.query(models.Article)
    if category:
        query = query.filter(models.Article.category == category)
    articles = query.order_by(models.Article.published_at.desc()).offset(skip).limit(limit).all()
    return articles

def episode_generation_pipeline(episode_id: int, request: schemas.EpisodeGenerateRequest):
    """Background task to generate script and audio for an episode."""
    db = SessionLocal()
    try:
        # Get episode
        episode = db.query(models.Episode).filter(models.Episode.id == episode_id).first()
        if not episode:
            return
            
        script = ""
        voice = request.voice or "en-IN-NeerjaNeural"

        # Mode 1: Direct Text Input
        if request.source_mode == "text" or (request.article_text and request.article_text.strip()):
            article_content = request.article_text.strip() if request.article_text else ""
            if not article_content:
                episode.status = "failed"
                episode.error_message = "No article text provided."
                db.commit()
                return

            # Store as custom article record for history
            custom_article = models.Article(
                title=request.title or "Custom News Story",
                source="Custom Article Input",
                url=f"custom://episode/{episode.id}",
                content=article_content,
                category="Custom",
                published_at=datetime.datetime.now(datetime.timezone.utc),
                importance_score=1.0
            )
            db.add(custom_article)
            db.commit()
            db.refresh(custom_article)
            episode.articles.append(custom_article)
            db.commit()

            # Generate Script via AI from raw text
            script = generate_podcast_script_from_text(
                article_text=article_content,
                tone=request.tone,
                host_style=request.host_style,
                title=request.title
            )

        # Mode 2: Live News Channel Outlet (The Hindu, NDTV, Times of India, etc.)
        elif request.source_mode in ["channel", "rss"] or request.source_id:
            source_id = request.source_id or "the_hindu"
            category_id = request.category or "national"
            
            # Fetch live articles dynamically from the chosen outlet
            articles = fetch_articles_from_source(
                source_id=source_id,
                category_id=category_id,
                limit=request.num_stories,
                db=db
            )

            if not articles:
                episode.status = "failed"
                episode.error_message = f"No articles found for channel '{source_id}' and category '{category_id}'."
                db.commit()
                logger.warning(f"Episode {episode_id} failed: {episode.error_message}")
                return

            # Link articles to episode
            for article in articles:
                if article not in episode.articles:
                    episode.articles.append(article)
            db.commit()

            # Generate Script via AI from fetched live articles
            script = generate_podcast_script(articles, request.tone, request.host_style)

        else:
            episode.status = "failed"
            episode.error_message = "Invalid generation mode or source configuration."
            db.commit()
            return

        episode.script = script
        episode.status = "script_generated"
        db.commit()

        # 3. Generate Audio via TTS
        audio_filename = f"episode_{episode.id}.mp3"
        audio_url = generate_audio_from_script(script, audio_filename, voice=voice)
        
        episode.audio_url = audio_url
        episode.status = "completed"
        db.commit()

    except Exception as e:
        logger.error(f"Error in episode generation pipeline for episode {episode_id}: {e}", exc_info=True)
        episode = db.query(models.Episode).filter(models.Episode.id == episode_id).first()
        if episode:
            episode.status = "failed"
            episode.error_message = str(e)
            db.commit()
    finally:
        db.close()

@router.post("/episodes/generate", response_model=schemas.Episode)
def generate_episode(request: schemas.EpisodeGenerateRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Creates a new episode and triggers the generation pipeline in the background."""
    new_episode = models.Episode(
        title=request.title if request.title and request.title.strip() else "AI News Briefing",
        status="pending"
    )
    db.add(new_episode)
    db.commit()
    db.refresh(new_episode)

    background_tasks.add_task(episode_generation_pipeline, new_episode.id, request)
    
    return new_episode

@router.get("/episodes", response_model=List[schemas.Episode])
def get_episodes(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """Retrieve all generated episodes."""
    episodes = db.query(models.Episode).order_by(models.Episode.created_at.desc()).offset(skip).limit(limit).all()
    return episodes

@router.get("/episodes/{episode_id}", response_model=schemas.Episode)
def get_episode(episode_id: int, db: Session = Depends(get_db)):
    """Retrieve a specific episode by ID."""
    episode = db.query(models.Episode).filter(models.Episode.id == episode_id).first()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    return episode

@router.delete("/episodes/{episode_id}", response_model=dict)
def delete_episode(episode_id: int, db: Session = Depends(get_db)):
    """Delete an episode and its associations."""
    episode = db.query(models.Episode).filter(models.Episode.id == episode_id).first()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    db.delete(episode)
    db.commit()
    return {"message": f"Episode {episode_id} deleted successfully"}

