import uuid
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import SessionLocal
from app.db import models

client = TestClient(app)

def test_create_and_get_show():
    unique_name = f"Show Test {uuid.uuid4().hex[:6]}"
    payload = {
        "name": unique_name,
        "description": "Daily automated show for test suite",
        "source_id": "the_hindu",
        "category": "national",
        "format": "dialogue",
        "voice_a": "en-IN-NeerjaNeural",
        "voice_b": "en-IN-PrabhatNeural",
        "target_minutes": 5,
        "schedule": "daily:08:00",
        "enabled": True
    }

    # Create show
    response = client.post("/api/shows", json=payload)
    assert response.status_code == 200, response.text
    created = response.json()
    show_id = created["id"]
    assert created["name"] == unique_name
    assert created["format"] == "dialogue"
    assert created["target_minutes"] == 5
    assert created["enabled"] is True
    assert created["episode_count"] == 0

    # Get specific show
    get_res = client.get(f"/api/shows/{show_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == show_id

    # List shows
    list_res = client.get("/api/shows")
    assert list_res.status_code == 200
    shows = list_res.json()
    assert any(s["id"] == show_id for s in shows)

    # Cleanup
    del_res = client.delete(f"/api/shows/{show_id}")
    assert del_res.status_code == 200

def test_update_and_toggle_show():
    unique_name = f"Show Update {uuid.uuid4().hex[:6]}"
    create_res = client.post("/api/shows", json={
        "name": unique_name,
        "format": "monologue",
        "target_minutes": 3,
        "schedule": "hourly",
        "enabled": True
    })
    assert create_res.status_code == 200
    show_id = create_res.json()["id"]

    # Update show
    update_res = client.put(f"/api/shows/{show_id}", json={
        "target_minutes": 10,
        "tone": "casual"
    })
    assert update_res.status_code == 200
    assert update_res.json()["target_minutes"] == 10
    assert update_res.json()["tone"] == "casual"

    # Toggle show (from enabled=True to enabled=False)
    toggle_res = client.post(f"/api/shows/{show_id}/toggle")
    assert toggle_res.status_code == 200
    assert toggle_res.json()["enabled"] is False

    # Toggle back to True
    toggle_res2 = client.post(f"/api/shows/{show_id}/toggle")
    assert toggle_res2.status_code == 200
    assert toggle_res2.json()["enabled"] is True

    # Cleanup
    client.delete(f"/api/shows/{show_id}")

def test_run_show_now_creates_episode_linked_to_show():
    unique_name = f"Show Run {uuid.uuid4().hex[:6]}"
    create_res = client.post("/api/shows", json={
        "name": unique_name,
        "source_id": "the_hindu",
        "category": "national",
        "format": "monologue",
        "target_minutes": 5,
        "schedule": "daily:08:00",
        "enabled": True
    })
    assert create_res.status_code == 200
    show_id = create_res.json()["id"]

    with patch("app.api.endpoints.episode_generation_pipeline") as mock_pipeline:
        run_res = client.post(f"/api/shows/{show_id}/run")
        assert run_res.status_code == 200
        ep_data = run_res.json()
        assert ep_data["show_id"] == show_id
        assert unique_name in ep_data["title"]
        assert ep_data["status"] == "pending"

    # Cleanup
    client.delete(f"/api/shows/{show_id}")

