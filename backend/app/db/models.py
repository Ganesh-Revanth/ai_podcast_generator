from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Table, Boolean
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()

class Show(Base):
    __tablename__ = "shows"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    source_id = Column(String, default="the_hindu")
    category = Column(String, default="national")
    topics = Column(String, nullable=True) # e.g. "tech, economy, politics"
    tone = Column(String, default="professional")
    format = Column(String, default="monologue") # monologue or dialogue
    voice = Column(String, default="en-IN-NeerjaNeural")
    voice_a = Column(String, default="en-IN-NeerjaNeural")
    voice_b = Column(String, default="en-IN-PrabhatNeural")
    target_minutes = Column(Integer, default=5)
    schedule = Column(String, default="daily:08:00")
    enabled = Column(Boolean, default=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship
    episodes = relationship("Episode", back_populates="show", cascade="all, delete-orphan")

# Association table for many-to-many relationship between episodes and articles
episode_article_association = Table(
    'episode_article', Base.metadata,
    Column('episode_id', Integer, ForeignKey('episodes.id'), primary_key=True),
    Column('article_id', Integer, ForeignKey('articles.id'), primary_key=True),
    Column('sort_order', Integer, default=0)
)

class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, index=True)
    title = Column(String, index=True)
    url = Column(String, unique=True, index=True)
    content = Column(Text, nullable=True) # full or extracted text
    summary = Column(Text, nullable=True) # ai generated summary
    published_at = Column(DateTime(timezone=True), nullable=True)
    category = Column(String, index=True, nullable=True)
    importance_score = Column(Float, default=0.0) # assigned by AI
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Episode(Base):
    __tablename__ = "episodes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    status = Column(String, default="pending") # pending, script_generated, completed, failed
    duration_seconds = Column(Integer, default=0)
    script = Column(Text, nullable=True)
    audio_url = Column(String, nullable=True) # relative path to the audio file
    error_message = Column(Text, nullable=True)
    show_id = Column(Integer, ForeignKey("shows.id"), nullable=True, index=True)
    fact_check_status = Column(String, default="unverified") # unverified, passed, flagged
    fact_check_flags = Column(Text, nullable=True) # JSON array of flagged claims
    transcript_segments = Column(Text, nullable=True) # JSON array of timed segments: [{"start": 0.0, "end": 4.5, "speaker": "A", "text": "..."}]
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    show = relationship("Show", back_populates="episodes")
    articles = relationship("Article", secondary=episode_article_association)
