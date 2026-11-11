import uuid
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.db import models
from app.schemas import schemas
from app.api.endpoints import episode_generation_pipeline

client = TestClient(app)

def test_get_news_sources():
    response = client.get("/api/news/sources")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert any(s["id"] == "the_hindu" for s in data)

def test_get_voices():
    response = client.get("/api/voices")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert any("Neural" in v["id"] for v in data)

def test_channel_returns_no_articles_fails_with_clear_error():
    db = SessionLocal()
    try:
        test_uuid = str(uuid.uuid4())
        # Pre-populate an unrelated article in DB to ensure it is NOT used as fallback
        unrelated = models.Article(
            source="Unrelated News",
            title=f"Unrelated Random News Story {test_uuid}",
            url=f"https://example.com/unrelated-news-{test_uuid}",
            content="Completely unrelated content",
            category="Random"
        )
        db.add(unrelated)
        db.commit()

        # Create episode
        episode = models.Episode(
            title="Channel Failure Test",
            status="pending"
        )
        db.add(episode)
        db.commit()
        db.refresh(episode)
        ep_id = episode.id

        req = schemas.EpisodeGenerateRequest(
            title="Channel Failure Test",
            source_mode="channel",
            source_id="non_existent_channel",
            category="national"
        )

        # Run pipeline
        episode_generation_pipeline(ep_id, req)

        # Refresh episode from DB (expire cache so newly committed changes from the pipeline are read)
        db.expire_all()
        updated_ep = db.query(models.Episode).filter(models.Episode.id == ep_id).first()
        assert updated_ep.status == "failed"
        assert updated_ep.error_message is not None
        assert "No articles found for channel 'non_existent_channel'" in updated_ep.error_message
        # Verify unrelated article was NOT linked to this episode!
        assert len(updated_ep.articles) == 0

    finally:
        db.close()

def test_direct_text_empty_fails_with_error_message():
    db = SessionLocal()
    try:
        episode = models.Episode(
            title="Empty Text Test",
            status="pending"
        )
        db.add(episode)
        db.commit()
        db.refresh(episode)
        ep_id = episode.id

        req = schemas.EpisodeGenerateRequest(
            title="Empty Text Test",
            source_mode="text",
            article_text="   "
        )

        episode_generation_pipeline(ep_id, req)

        db.expire_all()
        updated_ep = db.query(models.Episode).filter(models.Episode.id == ep_id).first()
        assert updated_ep.status == "failed"
        assert updated_ep.error_message == "No article text provided."
    finally:
        db.close()
