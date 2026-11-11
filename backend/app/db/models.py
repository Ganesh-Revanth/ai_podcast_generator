from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Table
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()

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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    articles = relationship("Article", secondary=episode_article_association)
