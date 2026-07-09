from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, PostgresDsn, RedisDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "AI Lead Intelligence Platform"
    app_url: str = "http://localhost:3000"
    api_url: str = "http://localhost:8000"
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = True
    secret_key: str = "change-me-in-production"

    # Database
    database_url: PostgresDsn = Field(
        default="postgresql+asyncpg://leadplatform:leadplatform@localhost:5432/leadplatform",
        description="Async PostgreSQL connection string",
    )
    database_echo: bool = False

    # Redis
    redis_url: RedisDsn = Field(default="redis://localhost:6379/0")

    # Elasticsearch
    elasticsearch_url: str = "http://localhost:9200"

    # Auth — JWT
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # OAuth — Google
    google_client_id: str = ""
    google_client_secret: str = ""

    # AI Providers
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    google_ai_api_key: str = ""
    ai_default_model: str = "openai/gpt-4o-mini"
    ai_smart_model: str = "openai/gpt-4o"
    ai_embedding_model: str = "openai/text-embedding-3-small"

    # Scraping
    proxy_url: str = ""
    captcha_api_key: str = ""
    scraping_max_concurrent: int = 5
    scraping_default_delay: float = 2.0

    # Email / SMTP
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    sendgrid_api_key: str = ""

    # WhatsApp
    whatsapp_api_token: str = ""
    whatsapp_phone_number_id: str = ""

    # Enrichment APIs
    hunter_api_key: str = ""
    apollo_api_key: str = ""
    clearbit_api_key: str = ""
    pagespeed_api_key: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # i18n
    default_locale: str = "es"
    supported_locales: list[str] = ["es", "en"]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
