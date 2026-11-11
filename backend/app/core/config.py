import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI News Podcast Generator"
    
    # SQLite DB (No Docker required)
    SQLITE_DB_PATH: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "ainews.db")
    
    # Optional LLM Config (uses open-source models via LiteLLM or OpenAI)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_BASE_URL: Optional[str] = None
    LLM_MODEL: str = "gpt-3.5-turbo" # Default model
    
    # Storage
    AUDIO_STORAGE_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "audio")
    MUSIC_STORAGE_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "music")

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"sqlite:///{self.SQLITE_DB_PATH}"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()

# Ensure storage dirs exist
os.makedirs(settings.AUDIO_STORAGE_DIR, exist_ok=True)
os.makedirs(settings.MUSIC_STORAGE_DIR, exist_ok=True)
