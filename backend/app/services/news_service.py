import feedparser
import logging
import trafilatura
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from email.utils import parsedate_tz, mktime_tz
from bs4 import BeautifulSoup
from typing import List, Dict, Optional

from app.db import models

logger = logging.getLogger(__name__)

NEWS_SOURCES = {
    "the_hindu": {
        "id": "the_hindu",
        "name": "The Hindu",
        "region": "India",
        "logo_text": "TH",
        "description": "India's premier national newspaper delivering authoritative reporting.",
        "categories": {
            "national": { "name": "National (India)", "url": "https://www.thehindu.com/news/national/feeder/default.rss" },
            "business": { "name": "Business & Economy", "url": "https://www.thehindu.com/business/feeder/default.rss" },
            "technology": { "name": "Tech & Sci-Tech", "url": "https://www.thehindu.com/sci-tech/technology/feeder/default.rss" },
            "science": { "name": "Science & Environment", "url": "https://www.thehindu.com/sci-tech/science/feeder/default.rss" },
            "international": { "name": "World News", "url": "https://www.thehindu.com/news/international/feeder/default.rss" }
        }
    },
    "ndtv": {
        "id": "ndtv",
        "name": "NDTV",
        "region": "India",
        "logo_text": "NDTV",
        "description": "Leading Indian broadcast network covering breaking national & business updates.",
        "categories": {
            "top_stories": { "name": "Top Headlines", "url": "https://feeds.feedburner.com/ndtvnews-top-stories" },
            "india": { "name": "India News", "url": "https://feeds.feedburner.com/ndtvnews-india-news" },
            "technology": { "name": "Gadgets 360 (Tech)", "url": "https://feeds.feedburner.com/gadgets360-latest" },
            "business": { "name": "NDTV Profit (Business)", "url": "https://feeds.feedburner.com/ndtvprofit-latest" },
            "sports": { "name": "Sports", "url": "https://feeds.feedburner.com/ndtvsports-latest" }
        }
    },
    "times_of_india": {
        "id": "times_of_india",
        "name": "Times of India",
        "region": "India",
        "logo_text": "TOI",
        "description": "India's highest circulation English daily covering breaking stories.",
        "categories": {
            "top_stories": { "name": "Top Stories", "url": "https://timesofindia.indiatimes.com/rssfeedstopstories.cms" },
            "india": { "name": "India Headlines", "url": "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms" },
            "business": { "name": "Business", "url": "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms" },
            "technology": { "name": "Technology", "url": "https://timesofindia.indiatimes.com/rssfeeds/66949542.cms" },
            "world": { "name": "World", "url": "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms" }
        }
    },
    "indian_express": {
        "id": "indian_express",
        "name": "The Indian Express",
        "region": "India",
        "logo_text": "IE",
        "description": "Investigative journalism and in-depth reporting across India.",
        "categories": {
            "india": { "name": "National News", "url": "https://indianexpress.com/section/india/feed/" },
            "business": { "name": "Business & Markets", "url": "https://indianexpress.com/section/business/feed/" },
            "technology": { "name": "Technology & AI", "url": "https://indianexpress.com/section/technology/feed/" },
            "world": { "name": "World Affairs", "url": "https://indianexpress.com/section/world/feed/" }
        }
    },
    "economic_times": {
        "id": "economic_times",
        "name": "The Economic Times",
        "region": "India",
        "logo_text": "ET",
        "description": "India's #1 financial newspaper for markets, startups, and macroeconomics.",
        "categories": {
            "top_stories": { "name": "Top Financial Stories", "url": "https://economictimes.indiatimes.com/rssfeedstopstories.cms" },
            "markets": { "name": "Stock Markets & Sensex", "url": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms" },
            "technology": { "name": "Tech & Startups", "url": "https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms" },
            "industry": { "name": "Industry & Economy", "url": "https://economictimes.indiatimes.com/industry/rssfeeds/13352306.cms" }
        }
    },
    "bbc": {
        "id": "bbc",
        "name": "BBC News",
        "region": "Global",
        "logo_text": "BBC",
        "description": "World-renowned international public broadcaster.",
        "categories": {
            "world": { "name": "World Headlines", "url": "http://feeds.bbci.co.uk/news/world/rss.xml" },
            "technology": { "name": "Technology", "url": "http://feeds.bbci.co.uk/news/technology/rss.xml" },
            "business": { "name": "Business", "url": "http://feeds.bbci.co.uk/news/business/rss.xml" },
            "science": { "name": "Science & Climate", "url": "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml" }
        }
    }
}

def clean_html(raw_html: str) -> str:
    if not raw_html:
        return ""
    soup = BeautifulSoup(raw_html, "html.parser")
    # Remove script and style elements
    for script in soup(["script", "style"]):
        script.extract()
    text = soup.get_text(separator=" ", strip=True)
    return text

def parse_date(date_string: Optional[str]) -> datetime:
    if not date_string:
        return datetime.now(timezone.utc)
    try:
        time_tuple = parsedate_tz(date_string)
        if time_tuple:
            timestamp = mktime_tz(time_tuple)
            return datetime.fromtimestamp(timestamp, timezone.utc)
    except Exception:
        pass
    return datetime.now(timezone.utc)

def extract_full_article_text(url: str, fallback_html: str = "") -> str:
    """
    Attempts to extract clean, full article text from a URL using trafilatura.
    Falls back to clean_html(fallback_html) if extraction fails, times out,
    or returns fewer than 80 characters.
    """
    fallback = clean_html(fallback_html) if fallback_html else ""
    if not url or url.startswith("custom://"):
        return fallback

    try:
        downloaded = trafilatura.fetch_url(url)
        if downloaded:
            extracted = trafilatura.extract(
                downloaded,
                include_comments=False,
                include_tables=False,
                no_fallback=False
            )
            if extracted and len(extracted.strip()) >= 80:
                return extracted.strip()
    except Exception as e:
        logger.debug(f"Trafilatura extraction failed for {url}: {e}")

    return fallback

def get_available_sources() -> List[Dict]:
    """Returns the list of news channels and their supported categories."""
    sources_list = []
    for s_id, s_data in NEWS_SOURCES.items():
        categories = [{"id": c_id, "name": c_data["name"]} for c_id, c_data in s_data["categories"].items()]
        sources_list.append({
            "id": s_id,
            "name": s_data["name"],
            "region": s_data["region"],
            "logo_text": s_data["logo_text"],
            "description": s_data["description"],
            "categories": categories
        })
    return sources_list

def fetch_articles_from_source(source_id: str, category_id: Optional[str] = None, limit: int = 5, db: Optional[Session] = None) -> List[models.Article]:
    """
    Fetches live news articles on-demand for a given news outlet and category.
    Saves new articles to DB if a session is provided, and returns the article objects.
    """
    source_config = NEWS_SOURCES.get(source_id)
    if not source_config:
        logger.warning(f"Unknown news source requested: {source_id}")
        return []

    available_categories = source_config["categories"]
    if category_id and category_id not in available_categories:
        logger.warning(f"Category '{category_id}' not found for source '{source_id}'")
        return []

    if not category_id:
        category_id = list(available_categories.keys())[0]

    feed_url = available_categories[category_id]["url"]
    category_name = available_categories[category_id]["name"]
    source_name = source_config["name"]

    feed = feedparser.parse(feed_url)
    fetched_articles = []

    for entry in feed.entries[:limit * 2]: # fetch enough to filter
        if len(fetched_articles) >= limit:
            break

        url = getattr(entry, 'link', '')
        title = getattr(entry, 'title', '')
        if not title or not url:
            continue

        raw_summary = getattr(entry, 'summary', '') or getattr(entry, 'description', '')
        content = extract_full_article_text(url, fallback_html=raw_summary)
        if len(content) < 15: # if summary is very short, use title
            content = title

        # Check DB if provided
        article = None
        if db:
            article = db.query(models.Article).filter(models.Article.url == url).first()

        if article and (not article.content or len(article.content) < 150) and len(content) > len(article.content or ""):
            article.content = content
            if db:
                db.commit()

        if not article:
            article = models.Article(
                source=source_name,
                title=title,
                url=url,
                content=content,
                category=category_name,
                published_at=parse_date(getattr(entry, 'published', None)),
                importance_score=min(len(content) / 400.0, 5.0)
            )
            if db:
                db.add(article)
                try:
                    db.commit()
                    db.refresh(article)
                except Exception:
                    db.rollback()
                    article = db.query(models.Article).filter(models.Article.url == url).first()

        if article:
            fetched_articles.append(article)

    return fetched_articles

def fetch_and_store_news(db: Session):
    """Background full sync across default categories of all outlets."""
    for s_id in NEWS_SOURCES:
        for c_id in NEWS_SOURCES[s_id]["categories"]:
            try:
                fetch_articles_from_source(s_id, c_id, limit=5, db=db)
            except Exception as e:
                logger.error(f"Error fetching {s_id}:{c_id}: {e}")

