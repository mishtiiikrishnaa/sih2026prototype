from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    app_name: str = "Setu API"
    secret_key: str = "setu-demo-secret-key-change-in-production-2026"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    database_url: str = "sqlite:///./setu.db"
    gemini_api_key: str = ""
    
    class Config:
        env_file = ".env"
        extra = "ignore"

@lru_cache()
def get_settings():
    return Settings()
