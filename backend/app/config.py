"""
Application configuration management using Pydantic Settings.
Loads configuration from environment variables with validation.
"""
from __future__ import annotations

import os
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    app_env: str = "development"
    app_name: str = "ClinkerFlow Optimization API"
    app_version: str = "0.1.0"
    debug: bool = True
    
    # Server
    host: str = "127.0.0.1"
    port: int = 8000
    
    # CORS - parse comma-separated string into list
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:4028,http://127.0.0.1:4028"
    
    # Security
    secret_key: str = "change-this-to-a-secure-random-string-in-production"
    api_key_header: str = "X-API-Key"
    
    # Optimization
    max_periods: int = 52
    default_periods: int = 4
    max_plants: int = 500
    max_routes: int = 500
    
    # Data
    data_dir: str = "../real_data"
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
    
    # Rate Limiting
    rate_limit_per_minute: int = 60
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        origins = [origin.strip() for origin in self.allowed_origins.split(",")]
        # Filter out wildcard patterns as they need regex handling
        return [o for o in origins if '*' not in o]
    
    @property
    def cors_origin_regex(self) -> str:
        """Create regex pattern for wildcard origins."""
        # Support both exact domains and Vercel preview deployments
        return r"https://clinkerflow-optimization.*\.vercel\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.app_env.lower() == "production"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

# Add production CORS origins
cors_origins = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else [
    "http://localhost:3003",
    "https://your-app.vercel.app",  # Add your Vercel domain
    "https://*.vercel.app"
]