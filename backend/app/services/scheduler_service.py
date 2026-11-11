import re
import datetime
import logging
from typing import Optional
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.db.session import SessionLocal
from app.db import models
from app.schemas import schemas
from app.services.ai_service import calculate_story_count

logger = logging.getLogger(__name__)

# Global BackgroundScheduler instance
scheduler = BackgroundScheduler(timezone="UTC")

def parse_schedule_trigger(schedule_str: Optional[str]):
    """
    Parses a schedule string into an APScheduler trigger.
    Supported formats:
      - 'daily:HH:MM' (e.g. 'daily:08:00' for 8:00 AM UTC)
      - 'hourly' (runs every hour)
      - 'every_<N>_hours' (e.g. 'every_6_hours')
      - 'every_<N>_minutes' (e.g. 'every_30_minutes')
      - Standard 5-field cron expression (e.g. '0 8 * * *')
    """
    if not schedule_str or not schedule_str.strip():
        # Default fallback: daily at 08:00
        return CronTrigger(hour=8, minute=0, timezone="UTC")

    s = schedule_str.strip().lower()

    # Format: daily:HH:MM or daily:HH
    if s.startswith("daily:"):
        parts = s.split("daily:")[1].strip().split(":")
        try:
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
            return CronTrigger(hour=hour, minute=minute, timezone="UTC")
        except ValueError:
            logger.warning(f"Invalid daily format '{schedule_str}', falling back to 08:00 UTC")
            return CronTrigger(hour=8, minute=0, timezone="UTC")

    # Format: hourly
    if s == "hourly":
        return IntervalTrigger(hours=1, timezone="UTC")

    # Format: every_N_hours
    m_hours = re.match(r'^every_(\d+)_hours?$', s)
    if m_hours:
        hours = max(1, int(m_hours.group(1)))
        return IntervalTrigger(hours=hours, timezone="UTC")

    # Format: every_N_minutes
    m_mins = re.match(r'^every_(\d+)_minutes?$', s)
    if m_mins:
        minutes = max(1, int(m_mins.group(1)))
        return IntervalTrigger(minutes=minutes, timezone="UTC")

    # Try standard cron expression: 'minute hour day month day_of_week'
    tokens = schedule_str.strip().split()
    if len(tokens) == 5:
        try:
            return CronTrigger.from_crontab(schedule_str.strip(), timezone="UTC")
        except Exception as e:
            logger.warning(f"Failed to parse cron '{schedule_str}': {e}. Defaulting to daily 08:00 UTC.")
            return CronTrigger(hour=8, minute=0, timezone="UTC")

    logger.warning(f"Unrecognized schedule expression '{schedule_str}'. Defaulting to daily 08:00 UTC.")
    return CronTrigger(hour=8, minute=0, timezone="UTC")

def run_scheduled_show_execution(show_id: int):
    """
    Callback function executed by APScheduler when a show schedule triggers.
    Runs generation pipeline in background thread.
    """
    from app.api.endpoints import episode_generation_pipeline

    db = SessionLocal()
    try:
        show = db.query(models.Show).filter(models.Show.id == show_id).first()
        if not show:
            logger.warning(f"Scheduled show {show_id} not found in database.")
            return
        if not show.enabled:
            logger.info(f"Scheduled show {show_id} ('{show.name}') is disabled. Skipping execution.")
            return

        now_utc = datetime.datetime.now(datetime.timezone.utc)
        date_str = now_utc.strftime("%b %d, %Y")
        episode_title = f"{show.name} - {date_str}"

        target_minutes = show.target_minutes or 5
        num_stories = calculate_story_count(target_minutes)

        # Create Episode record
        new_episode = models.Episode(
            title=episode_title,
            status="pending",
            show_id=show.id
        )
        db.add(new_episode)
        db.commit()
        db.refresh(new_episode)

        # Build generation request
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

        logger.info(f"Triggering scheduled generation for Show '{show.name}' (ID: {show.id}) -> Episode {new_episode.id}")
        episode_generation_pipeline(new_episode.id, gen_request)

        # Update show last_run_at
        show.last_run_at = datetime.datetime.now(datetime.timezone.utc)
        db.commit()

    except Exception as e:
        logger.error(f"Error executing scheduled show {show_id}: {e}", exc_info=True)
    finally:
        db.close()

def schedule_show_job(show: models.Show):
    """
    Registers or updates the scheduled job for a given show.
    If the show is disabled, removes any existing scheduled job.
    """
    job_id = f"show_{show.id}"

    if not show.enabled:
        remove_show_job(show.id)
        return

    trigger = parse_schedule_trigger(show.schedule)
    try:
        scheduler.add_job(
            run_scheduled_show_execution,
            trigger=trigger,
            args=[show.id],
            id=job_id,
            name=f"Show: {show.name} (ID: {show.id})",
            replace_existing=True,
            misfire_grace_time=3600 # 1 hour grace window
        )
        logger.info(f"Registered scheduled job '{job_id}' for Show '{show.name}' with schedule '{show.schedule}'.")
    except Exception as e:
        logger.error(f"Failed to schedule job for show {show.id}: {e}", exc_info=True)

def remove_show_job(show_id: int):
    """Removes a show's scheduled job if it exists."""
    job_id = f"show_{show_id}"
    try:
        if scheduler.get_job(job_id):
            scheduler.remove_job(job_id)
            logger.info(f"Removed scheduled job '{job_id}'.")
    except Exception as e:
        logger.error(f"Error removing job '{job_id}': {e}", exc_info=True)

def sync_all_show_jobs(db):
    """Syncs all enabled shows from the database into the scheduler."""
    shows = db.query(models.Show).filter(models.Show.enabled == True).all()
    logger.info(f"Syncing {len(shows)} active shows into APScheduler...")
    for show in shows:
        schedule_show_job(show)

def start_scheduler():
    """Starts the BackgroundScheduler if not running."""
    if not scheduler.running:
        scheduler.start()
        logger.info("APScheduler started.")

def stop_scheduler():
    """Stops the BackgroundScheduler if running."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler shut down.")

