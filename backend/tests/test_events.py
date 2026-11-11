import json
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db import models
from app.db.session import SessionLocal
from app.services.event_service import PipelineEventManager

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def db():
    db_session = SessionLocal()
    try:
        yield db_session
    finally:
        db_session.close()

@pytest.mark.anyio
async def test_pipeline_event_manager():
    mgr = PipelineEventManager()
    ep_id = 101

    queue = mgr.subscribe(ep_id)
    assert queue is not None

    mgr.publish(ep_id, stage="fetching", progress=15, message="Fetching feeds...")
    latest = mgr.get_latest_event(ep_id)
    assert latest["stage"] == "fetching"
    assert latest["progress"] == 15

    # Check that queue received event
    event = await queue.get()
    assert event["stage"] == "fetching"
    assert event["message"] == "Fetching feeds..."

    mgr.unsubscribe(ep_id, queue)
    mgr.publish(ep_id, stage="scripting", progress=50, message="Drafting script...")
    assert queue.empty()

def test_sse_endpoint_completed_episode(client, db):
    ep = models.Episode(
        title="Completed Ep",
        status="completed",
        audio_url="/static/audio/sample.mp3",
        duration_seconds=120
    )
    db.add(ep)
    db.commit()
    db.refresh(ep)

    response = client.get(f"/api/episodes/{ep.id}/events")
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    assert "data: " in response.text
    assert '"stage": "done"' in response.text

def test_sse_endpoint_failed_episode(client, db):
    ep = models.Episode(
        title="Failed Ep",
        status="failed",
        error_message="RSS feed unreachable"
    )
    db.add(ep)
    db.commit()
    db.refresh(ep)

    response = client.get(f"/api/episodes/{ep.id}/events")
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    assert '"stage": "failed"' in response.text
    assert "RSS feed unreachable" in response.text

def test_sse_endpoint_404_missing(client):
    response = client.get("/api/episodes/888888/events")
    assert response.status_code == 404

