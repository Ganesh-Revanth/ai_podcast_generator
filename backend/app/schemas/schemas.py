from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ArticleBase(BaseModel):
    title: str
    source: str
    url: str
    content: Optional[str] = None
    summary: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    importance_score: Optional[float] = 0.0

class Article(ArticleBase):
    id: int
    published_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class NewsCategory(BaseModel):
    id: str
    name: str

class NewsSource(BaseModel):
    id: str
    name: str
    region: str
    logo_text: str
    description: str
    categories: List[NewsCategory] = []

class VoiceOption(BaseModel):
    id: str
    name: str
    gender: str
    locale: str
    description: str

class EpisodeGenerateRequest(BaseModel):
    title: str = "AI News Briefing"
    source_mode: str = "channel" # "text" or "channel"
    source_id: Optional[str] = "the_hindu"
    category: Optional[str] = "national"
    article_text: Optional[str] = None
    voice: Optional[str] = "en-IN-NeerjaNeural"
    num_stories: int = 5
    categories: List[str] = [] # backwards compatibility
    tone: str = "professional"
    host_style: str = "informative"

class EpisodeBase(BaseModel):
    title: str
    status: str
    duration_seconds: Optional[int] = 0

class Episode(EpisodeBase):
    id: int
    script: Optional[str] = None
    audio_url: Optional[str] = None
    created_at: datetime
    articles: List[Article] = []

    class Config:
        from_attributes = True
