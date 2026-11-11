import os
import email.utils
import datetime
import html
import logging
from typing import List, Optional
import xml.etree.ElementTree as ET

from app.core.config import settings
from app.db import models

logger = logging.getLogger(__name__)

# Register XML namespaces so ElementTree serializes itunes: and content: tags properly
ET.register_namespace("itunes", "http://www.itunes.com/dtds/podcast-1.0.dtd")
ET.register_namespace("content", "http://purl.org/rss/1.0/modules/content/")
ET.register_namespace("atom", "http://www.w3.org/2005/Atom")

def format_rfc822_date(dt: Optional[datetime.datetime]) -> str:
    """Formats a datetime object into standard RSS RFC 822 timestamp (GMT)."""
    if dt is None:
        dt = datetime.datetime.now(datetime.timezone.utc)
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return email.utils.formatdate(dt.timestamp(), usegmt=True)

def get_audio_file_size(audio_url: Optional[str], duration_seconds: int = 0) -> int:
    """
    Computes byte size for the enclosure tag. Resolves local MP3 from static storage
    or estimates based on 192kbps audio bitrate.
    """
    if audio_url:
        filename = os.path.basename(audio_url)
        local_path = os.path.join(settings.AUDIO_STORAGE_DIR, filename)
        if os.path.exists(local_path):
            try:
                return os.path.getsize(local_path)
            except Exception as e:
                logger.warning(f"Could not read size for audio file {local_path}: {e}")

    # Fallback byte calculation: ~24,000 bytes per second at 192kbps MP3
    safe_duration = max(30, duration_seconds or 120)
    return safe_duration * 24000

def build_show_notes_html(episode: models.Episode) -> str:
    """Creates rich HTML show notes for the RSS content:encoded and description tags."""
    parts = []
    
    # Overview
    if episode.title:
        parts.append(f"<p><strong>{html.escape(episode.title)}</strong></p>")
    
    parts.append("<p>Welcome to this AI-synthesized news briefing, curated and produced automatically.</p>")

    # Fact-check status
    if episode.fact_check_status == "passed":
        parts.append("<p><em>✓ Fact-Check: All key claims in this episode were verified against ground-truth source reporting.</em></p>")
    elif episode.fact_check_status == "flagged":
        parts.append("<p><em>⚠ Fact-Check Notice: Some claims in this episode may differ from original reporting.</em></p>")

    # Referenced source articles
    if episode.articles:
        parts.append("<h3>Referenced Sources & Further Reading:</h3>")
        parts.append("<ul>")
        for art in episode.articles:
            title_escaped = html.escape(art.title or "News Article")
            source_escaped = html.escape(art.source or "News Outlet")
            if art.url:
                url_escaped = html.escape(art.url)
                parts.append(f'<li><a href="{url_escaped}" target="_blank" rel="noopener noreferrer">{title_escaped}</a> — <em>{source_escaped}</em></li>')
            else:
                parts.append(f'<li>{title_escaped} — <em>{source_escaped}</em></li>')
        parts.append("</ul>")

    return "\n".join(parts)

def build_rss_xml(
    title: str,
    description: str,
    link: str,
    episodes: List[models.Episode],
    base_url: str,
    category: str = "News",
    image_url: Optional[str] = None
) -> str:
    """
    Constructs an iTunes/Apple Podcasts-compliant RSS 2.0 XML document.
    """
    clean_base_url = base_url.rstrip("/")
    feed_image = image_url or f"{clean_base_url}/static/music/podcast_art.png"

    # Root RSS element (registered namespaces itunes, content, atom are automatically serialized)
    rss = ET.Element("rss", {"version": "2.0"})

    channel = ET.SubElement(rss, "channel")

    # Channel Metadata
    ET.SubElement(channel, "title").text = title
    ET.SubElement(channel, "link").text = link
    ET.SubElement(channel, "description").text = description
    ET.SubElement(channel, "language").text = "en-us"
    ET.SubElement(channel, "generator").text = "AI News Podcast Studio"
    ET.SubElement(channel, "lastBuildDate").text = format_rfc822_date(datetime.datetime.now(datetime.timezone.utc))

    # iTunes Channel Tags
    ET.SubElement(channel, "{http://www.itunes.com/dtds/podcast-1.0.dtd}author").text = "AI News Podcast"
    ET.SubElement(channel, "{http://www.itunes.com/dtds/podcast-1.0.dtd}summary").text = description
    ET.SubElement(channel, "{http://www.itunes.com/dtds/podcast-1.0.dtd}explicit").text = "no"

    # Category
    itunes_cat = ET.SubElement(
        channel,
        "{http://www.itunes.com/dtds/podcast-1.0.dtd}category",
        {"text": "News"}
    )
    if category and category.lower() != "news":
        sub_cat_name = "Tech News" if "tech" in category.lower() else "Daily News"
        ET.SubElement(itunes_cat, "{http://www.itunes.com/dtds/podcast-1.0.dtd}category", {"text": sub_cat_name})

    # Channel Image
    ET.SubElement(channel, "{http://www.itunes.com/dtds/podcast-1.0.dtd}image", {"href": feed_image})
    
    # Standard RSS Image
    image_el = ET.SubElement(channel, "image")
    ET.SubElement(image_el, "url").text = feed_image
    ET.SubElement(image_el, "title").text = title
    ET.SubElement(image_el, "link").text = link

    # Episodes (Completed only)
    completed_episodes = [ep for ep in episodes if ep.status == "completed" and ep.audio_url]

    for ep in completed_episodes:
        item = ET.SubElement(channel, "item")
        
        ET.SubElement(item, "title").text = ep.title or f"Episode #{ep.id}"
        
        # Audio URL & Enclosure
        raw_audio_url = ep.audio_url
        if raw_audio_url.startswith("http://") or raw_audio_url.startswith("https://"):
            audio_full_url = raw_audio_url
        else:
            audio_full_url = f"{clean_base_url}/{raw_audio_url.lstrip('/')}"

        enclosure_length = str(get_audio_file_size(ep.audio_url, ep.duration_seconds))
        ET.SubElement(
            item,
            "enclosure",
            {
                "url": audio_full_url,
                "length": enclosure_length,
                "type": "audio/mpeg"
            }
        )

        # Unique GUID
        guid = ET.SubElement(item, "guid", {"isPermaLink": "false"})
        guid.text = f"ainews-episode-{ep.id}"

        # Publication Date
        ET.SubElement(item, "pubDate").text = format_rfc822_date(ep.created_at)

        # Duration
        duration_sec = ep.duration_seconds or 120
        ET.SubElement(item, "{http://www.itunes.com/dtds/podcast-1.0.dtd}duration").text = str(duration_sec)
        ET.SubElement(item, "{http://www.itunes.com/dtds/podcast-1.0.dtd}explicit").text = "no"

        # Show notes & description
        show_notes_html = build_show_notes_html(ep)
        clean_desc = (ep.script[:400] + "...") if (ep.script and len(ep.script) > 400) else (ep.script or ep.title)
        ET.SubElement(item, "description").text = clean_desc
        
        # CDATA content:encoded
        content_el = ET.SubElement(item, "{http://purl.org/rss/1.0/modules/content/}encoded")
        content_el.text = show_notes_html

    # Serialize to XML
    xml_str = ET.tostring(rss, encoding="utf-8", method="xml").decode("utf-8")
    return f'<?xml version="1.0" encoding="UTF-8"?>\n{xml_str}'

def build_show_rss_feed(show: models.Show, episodes: List[models.Episode], base_url: str) -> str:
    """Generates an RSS feed for a specific Show and its episodes."""
    title = show.name or "AI News Show"
    desc = show.description or f"Daily AI news show covering {show.source_id or 'top stories'}."
    link = f"{base_url.rstrip('/')}/shows"
    category = show.category or "News"
    return build_rss_xml(
        title=title,
        description=desc,
        link=link,
        episodes=episodes,
        base_url=base_url,
        category=category
    )

def build_global_rss_feed(episodes: List[models.Episode], base_url: str) -> str:
    """Generates a global RSS feed including all recent completed episodes across all shows."""
    title = "AI News Daily Podcast"
    desc = "Your daily automated AI news podcast briefing, synthesizing headlines from authoritative outlets."
    link = base_url.rstrip("/")
    return build_rss_xml(
        title=title,
        description=desc,
        link=link,
        episodes=episodes,
        base_url=base_url,
        category="News"
    )
