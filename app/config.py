"""Application configuration."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Claude projects directory
    claude_projects_dir: Path = Path.home() / ".claude" / "projects"

    # Uploaded files directory
    upload_dir: Path = Path.home() / ".claude-log-converter" / "uploads"

    # Cache settings
    cache_ttl_seconds: int = 300  # 5 minutes
    cache_max_size: int = 100

    # Pagination defaults
    default_page_size: int = 20
    max_page_size: int = 100

    class Config:
        env_prefix = "CLAUDE_LOG_"


settings = Settings()

# Ensure upload directory exists
settings.upload_dir.mkdir(parents=True, exist_ok=True)
