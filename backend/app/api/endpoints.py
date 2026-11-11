import datetime
import json
import logging
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db, SessionLocal
from app.db import models
from app.schemas import schemas
from app.services.news_service import fetch_and_store_news, get_available_sources, fetch_articles_from_source, NEWS_SOURCES
from app.services.curation_service import deduplicate_articles, cluster_articles_by_topic
from app.services.ai_service import (
    generate_podcast_script,
    generate_podcast_script_from_text,
    generate_podcast_dialogue,
    generate_podcast_dialogue_from_text,
    format_dialogue_script,
    calculate_story_count,
    fact_check_script
)
from app.services.tts_service import (
    generate_audio_from_script,
    generate_dialogue_audio_from_turns,
    VOICE_OPTIONS,
    HOST_PAIR_OPTIONS
)
from app.services.scheduler_service import schedule_show_job, remove_show_job

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

@router.get("/voices/host-pairs", response_model=List[schemas.HostPairOption])
def get_host_pairs():
    """Retrieve available dual-host voice pairs."""
    return HOST_PAIR_OPTIONS

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
            
        if request.show_id and not episode.show_id:
            episode.show_id = request.show_id
            db.commit()

        script = ""
        is_dialogue = (request.format == "dialogue")
        dialogue_turns = []
        voice = request.voice or "en-IN-NeerjaNeural"
        target_minutes = request.target_minutes or 5

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
            if is_dialogue:
                dialogue_turns = generate_podcast_dialogue_from_text(
                    article_text=article_content,
                    tone=request.tone,
                    host_style=request.host_style,
                    title=request.title,
                    target_minutes=target_minutes
                )
                script = format_dialogue_script(dialogue_turns)
            else:
                script = generate_podcast_script_from_text(
                    article_text=article_content,
                    tone=request.tone,
                    host_style=request.host_style,
                    title=request.title,
                    target_minutes=target_minutes
                )

        # Mode 2: Live News Channel Outlet (The Hindu, NDTV, Times of India, etc.)
        elif request.source_mode in ["channel", "rss"] or request.source_id:
            source_id = request.source_id or "the_hindu"
            category_id = request.category or "national"
            num_stories = request.num_stories if (request.num_stories and request.num_stories > 0) else calculate_story_count(target_minutes)
            
            # Fetch live articles dynamically from the chosen outlet
            articles = fetch_articles_from_source(
                source_id=source_id,
                category_id=category_id,
                limit=num_stories,
                db=db
            )

            if not articles:
                episode.status = "failed"
                episode.error_message = f"No articles found for channel '{source_id}' and category '{category_id}'."
                db.commit()
                logger.warning(f"Episode {episode_id} failed: {episode.error_message}")
                return

            # Deduplicate near-identical stories across outlets
            articles = deduplicate_articles(articles)

            # Cluster stories by topic so the script has cohesive segments
            clusters = cluster_articles_by_topic(articles)

            # Link articles to episode
            for article in articles:
                if article not in episode.articles:
                    episode.articles.append(article)
            db.commit()

            # Generate Script via AI from fetched live articles organized by clusters
            if is_dialogue:
                dialogue_turns = generate_podcast_dialogue(
                    articles=articles,
                    tone=request.tone,
                    host_style=request.host_style,
                    target_minutes=target_minutes,
                    clusters=clusters
                )
                script = format_dialogue_script(dialogue_turns)
            else:
                script = generate_podcast_script(
                    articles=articles,
                    tone=request.tone,
                    host_style=request.host_style,
                    target_minutes=target_minutes,
                    clusters=clusters
                )

        else:
            episode.status = "failed"
            episode.error_message = "Invalid generation mode or source configuration."
            db.commit()
            return

        episode.script = script
        episode.status = "script_generated"
        db.commit()

        # Fact-Check Step: verify generated script claims against source articles
        try:
            source_docs = articles if (request.source_mode in ["channel", "rss"] or request.source_id) else episode.articles
            fc_status, fc_flags = fact_check_script(script, source_docs)
            episode.fact_check_status = fc_status
            episode.fact_check_flags = json.dumps(fc_flags) if fc_flags else None
            db.commit()
            logger.info(f"Fact-check for episode {episode.id} completed: status='{fc_status}', flags={len(fc_flags)}")
        except Exception as fc_err:
            logger.error(f"Error during fact check for episode {episode.id}: {fc_err}")
            episode.fact_check_status = "unverified"
            db.commit()

        # 3. Generate Audio via TTS
        audio_filename = f"episode_{episode.id}.mp3"
        if is_dialogue:
            voice_a = request.voice_a or "en-IN-NeerjaNeural"
            voice_b = request.voice_b or "en-IN-PrabhatNeural"
            audio_url = generate_dialogue_audio_from_turns(
                turns=dialogue_turns,
                filename=audio_filename,
                voice_a=voice_a,
                voice_b=voice_b,
                include_music=request.include_music
            )
        else:
            audio_url = generate_audio_from_script(script, audio_filename, voice=voice)
        
        episode.audio_url = audio_url
        episode.status = "completed"
        db.commit()

        # Update Show last_run_at if tied to a show
        if episode.show_id:
            show = db.query(models.Show).filter(models.Show.id == episode.show_id).first()
            if show:
                show.last_run_at = datetime.datetime.now(datetime.timezone.utc)
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
        status="pending",
        show_id=request.show_id
    )
    db.add(new_episode)
    db.commit()
    db.refresh(new_episode)

    background_tasks.add_task(episode_generation_pipeline, new_episode.id, request)
    
    return new_episode

@router.get("/episodes", response_model=List[schemas.Episode])
def get_episodes(skip: int = 0, limit: int = 50, show_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Retrieve all generated episodes, optionally filtered by show_id."""
    query = db.query(models.Episode)
    if show_id:
        query = query.filter(models.Episode.show_id == show_id)
    episodes = query.order_by(models.Episode.created_at.desc()).offset(skip).limit(limit).all()
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


# ---------------------------------------------------------------------------
# SHOWS CRUD & AUTOMATION ENDPOINTS
# ---------------------------------------------------------------------------

def _to_show_response(show: models.Show, db: Session) -> schemas.ShowResponse:
    count = db.query(models.Episode).filter(models.Episode.show_id == show.id).count()
    resp = schemas.ShowResponse.model_validate(show)
    resp.episode_count = count
    return resp

@router.get("/shows", response_model=List[schemas.ShowResponse])
def get_shows(db: Session = Depends(get_db)):
    """List all shows with episode count and schedule status."""
    shows = db.query(models.Show).order_by(models.Show.created_at.desc()).all()
    return [_to_show_response(s, db) for s in shows]

@router.post("/shows", response_model=schemas.ShowResponse)
def create_show(show_in: schemas.ShowCreate, db: Session = Depends(get_db)):
    """Create a new show and register its schedule."""
    new_show = models.Show(
        name=show_in.name,
        description=show_in.description,
        source_id=show_in.source_id or "the_hindu",
        category=show_in.category or "national",
        topics=show_in.topics,
        tone=show_in.tone or "professional",
        format=show_in.format or "monologue",
        voice=show_in.voice or "en-IN-NeerjaNeural",
        voice_a=show_in.voice_a or "en-IN-NeerjaNeural",
        voice_b=show_in.voice_b or "en-IN-PrabhatNeural",
        target_minutes=show_in.target_minutes or 5,
        schedule=show_in.schedule or "daily:08:00",
        enabled=show_in.enabled if show_in.enabled is not None else True
    )
    db.add(new_show)
    db.commit()
    db.refresh(new_show)

    # Register in scheduler
    schedule_show_job(new_show)

    return _to_show_response(new_show, db)

@router.get("/shows/{show_id}", response_model=schemas.ShowResponse)
def get_show(show_id: int, db: Session = Depends(get_db)):
    """Retrieve details for a specific show."""
    show = db.query(models.Show).filter(models.Show.id == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    return _to_show_response(show, db)

@router.put("/shows/{show_id}", response_model=schemas.ShowResponse)
def update_show(show_id: int, show_in: schemas.ShowUpdate, db: Session = Depends(get_db)):
    """Update show configuration and refresh its schedule."""
    show = db.query(models.Show).filter(models.Show.id == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    update_data = show_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(show, field, val)

    show.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(show)

    # Update scheduled job
    schedule_show_job(show)

    return _to_show_response(show, db)

@router.delete("/shows/{show_id}", response_model=dict)
def delete_show(show_id: int, db: Session = Depends(get_db)):
    """Delete a show, unregister its schedule, and delete associated episodes."""
    show = db.query(models.Show).filter(models.Show.id == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    remove_show_job(show.id)
    db.delete(show)
    db.commit()
    return {"message": f"Show {show_id} deleted successfully"}

@router.post("/shows/{show_id}/toggle", response_model=schemas.ShowResponse)
def toggle_show(show_id: int, db: Session = Depends(get_db)):
    """Toggle a show between enabled and disabled status."""
    show = db.query(models.Show).filter(models.Show.id == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    show.enabled = not show.enabled
    show.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(show)

    schedule_show_job(show)

    return _to_show_response(show, db)

@router.post("/shows/{show_id}/run", response_model=schemas.Episode)
def run_show_now(show_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Immediately trigger episode generation for a show ('Run Now')."""
    show = db.query(models.Show).filter(models.Show.id == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    now_utc = datetime.datetime.now(datetime.timezone.utc)
    date_str = now_utc.strftime("%b %d, %Y - %H:%M")
    episode_title = f"{show.name} ({date_str})"

    target_minutes = show.target_minutes or 5
    num_stories = calculate_story_count(target_minutes)

    new_episode = models.Episode(
        title=episode_title,
        status="pending",
        show_id=show.id
    )
    db.add(new_episode)
    db.commit()
    db.refresh(new_episode)

    gen_request = schemas.EpisodeGenerateRequest(
        title=episode_title,
        source_mode="channel",
        source_id=show.source_id or "the_hindu",
        category=show.category or "national",
        format=show.format or "monologue",
        voice=show.voice or "en-IN-NeerjaNeural",
        voice_a=show.voice_a or "en-IN-NeerjaNeural",
        voice_b=show.voice_b or "en-IN-PrabhatNeural",
        tone=show.tone or "professional",
        host_style="conversational" if show.format == "dialogue" else "informative",
        include_music=True,
        num_stories=num_stories,
        target_minutes=target_minutes,
        show_id=show.id
    )

    background_tasks.add_task(episode_generation_pipeline, new_episode.id, gen_request)

    return new_episode


