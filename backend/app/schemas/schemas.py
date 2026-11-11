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

class HostPairOption(BaseModel):
    id: str
    name: str
    description: str
    locale: str
    voice_a: str
    voice_b: str
    voice_a_name: str
    voice_b_name: str

class DialogueTurn(BaseModel):
    speaker: str # "A" or "B"
    text: str

class ShowBase(BaseModel):
    name: str
    description: Optional[str] = None
    source_id: Optional[str] = "the_hindu"
    category: Optional[str] = "national"
    topics: Optional[str] = None
    tone: Optional[str] = "professional"
    format: Optional[str] = "monologue" # monologue or dialogue
    voice: Optional[str] = "en-IN-NeerjaNeural"
    voice_a: Optional[str] = "en-IN-NeerjaNeural"
    voice_b: Optional[str] = "en-IN-PrabhatNeural"
    target_minutes: Optional[int] = 5
    schedule: Optional[str] = "daily:08:00"
    enabled: Optional[bool] = True

class ShowCreate(ShowBase):
    pass

class ShowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    source_id: Optional[str] = None
    category: Optional[str] = None
    topics: Optional[str] = None
    tone: Optional[str] = None
    format: Optional[str] = None
    voice: Optional[str] = None
    voice_a: Optional[str] = None
    voice_b: Optional[str] = None
    target_minutes: Optional[int] = None
    schedule: Optional[str] = None
    enabled: Optional[bool] = None

class ShowResponse(ShowBase):
    id: int
    last_run_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    episode_count: Optional[int] = 0

    class Config:
        from_attributes = True

class EpisodeGenerateRequest(BaseModel):
    title: str = "AI News Briefing"
    source_mode: str = "channel" # "text" or "channel"
    source_id: Optional[str] = "the_hindu"
    category: Optional[str] = "national"
    article_text: Optional[str] = None
    voice: Optional[str] = "en-IN-NeerjaNeural"
    format: str = "monologue" # "monologue" or "dialogue"
    voice_a: Optional[str] = "en-IN-NeerjaNeural"
    voice_b: Optional[str] = "en-IN-PrabhatNeural"
    include_music: bool = True
    num_stories: int = 5
    categories: List[str] = [] # backwards compatibility
    tone: str = "professional"
    host_style: str = "informative"
    show_id: Optional[int] = None
    target_minutes: Optional[int] = 5

class FactCheckFlag(BaseModel):
    claim: str
    status: str # "unsupported", "contradiction", "exaggeration"
    reason: str
    severity: Optional[str] = "medium" # "high", "medium", "low"

class EpisodeBase(BaseModel):
    title: str
    status: str
    duration_seconds: Optional[int] = 0
    error_message: Optional[str] = None
    show_id: Optional[int] = None
    fact_check_status: Optional[str] = "unverified" # "passed", "flagged", "unverified"
    fact_check_flags: Optional[str] = None # JSON string of flags

class Episode(EpisodeBase):
    id: int
    script: Optional[str] = None
    audio_url: Optional[str] = None
    created_at: datetime
    articles: List[Article] = []

    class Config:
        from_attributes = True
