import os
import uuid
import xml.etree.ElementTree as ET
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db import models
from app.db.session import SessionLocal
from app.services.feed_service import build_show_rss_feed, build_global_rss_feed, format_rfc822_date

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

def test_feed_service_xml_generation(db):
    uid = uuid.uuid4().hex[:8]
    show = models.Show(
        name=f"Tech Radar Daily {uid}",
        description="Daily technological breakthroughs.",
        source_id="the_hindu",
        category="technology"
    )
    db.add(show)
    db.commit()
    db.refresh(show)

    art_url = f"https://example.com/quantum-{uid}"
    art = models.Article(
        title="Breakthrough in Quantum Chips",
        source="The Hindu",
        url=art_url,
        content="Details about quantum computing."
    )
    db.add(art)
    db.commit()
    db.refresh(art)

    episode = models.Episode(
        title=f"Episode 1: Quantum Horizons {uid}",
        status="completed",
        audio_url=f"/static/audio/test_ep_{uid}.mp3",
        duration_seconds=185,
        script="Welcome to Tech Radar Daily.",
        show_id=show.id,
        fact_check_status="passed"
    )
    episode.articles.append(art)
    db.add(episode)
    db.commit()
    db.refresh(episode)

    xml_str = build_show_rss_feed(show=show, episodes=[episode], base_url="http://localhost:8000")
    
    # Verify XML can be parsed
    root = ET.fromstring(xml_str)
    assert root.tag == "rss"
    assert root.attrib.get("version") == "2.0"

    channel = root.find("channel")
    assert channel is not None
    assert f"Tech Radar Daily {uid}" in channel.find("title").text

    # Verify iTunes Author
    itunes_author = channel.find("{http://www.itunes.com/dtds/podcast-1.0.dtd}author")
    assert itunes_author is not None
    assert itunes_author.text == "AI News Podcast"

    # Verify Item & Enclosure
    items = channel.findall("item")
    assert len(items) == 1
    item = items[0]
    assert f"Episode 1: Quantum Horizons {uid}" in item.find("title").text

    enclosure = item.find("enclosure")
    assert enclosure is not None
    assert enclosure.attrib["url"] == f"http://localhost:8000/static/audio/test_ep_{uid}.mp3"
    assert enclosure.attrib["type"] == "audio/mpeg"
    assert int(enclosure.attrib["length"]) > 0

    duration = item.find("{http://www.itunes.com/dtds/podcast-1.0.dtd}duration")
    assert duration is not None
    assert duration.text == "185"

    content_encoded = item.find("{http://purl.org/rss/1.0/modules/content/}encoded")
    assert content_encoded is not None
    assert "Breakthrough in Quantum Chips" in content_encoded.text
    assert art_url in content_encoded.text

def test_show_feed_endpoint(client, db):
    uid = uuid.uuid4().hex[:8]
    show = models.Show(
        name=f"Morning Financial Pulse {uid}",
        description="Economic and market updates.",
        source_id="economic_times",
        category="markets"
    )
    db.add(show)
    db.commit()
    db.refresh(show)

    response = client.get(f"/api/shows/{show.id}/feed.xml")
    assert response.status_code == 200
    assert "application/xml" in response.headers["content-type"]
    assert f"Morning Financial Pulse {uid}" in response.text

def test_show_feed_404_on_missing_show(client):
    response = client.get("/api/shows/999999/feed.xml")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_global_feed_endpoint(client):
    response = client.get("/api/feed.xml")
    assert response.status_code == 200
    assert "application/xml" in response.headers["content-type"]
    assert "<rss" in response.text
