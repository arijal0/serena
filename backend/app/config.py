"""Centralized runtime configuration for the Serena pipeline.

Determinism is a hard requirement for a clinical compliance tool: every model
client is initialized with a near-zero temperature so that the same testimony
always yields the same escalation decision (see README → Deterministic Execution).
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="",
        extra="ignore",
    )

    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")

    model: str = Field(default="gemini-2.5-flash", alias="SERENA_MODEL")
    temperature: float = Field(default=0.0, alias="SERENA_TEMPERATURE")
    top_p: float = Field(default=0.1, alias="SERENA_TOP_P")
    max_output_tokens: int = Field(default=2048, alias="SERENA_MAX_OUTPUT_TOKENS")

    allowed_origins: str = Field(
        default="http://localhost:5173,http://localhost:3000,http://localhost:8080",
        alias="SERENA_ALLOWED_ORIGINS",
    )

    # Regex fallback so the API works on any localhost dev port without
    # enumerating every Vite/CRA/preview port the frontend might pick.
    allowed_origin_regex: str = Field(
        default=r"http://(localhost|127\.0\.0\.1):\d+",
        alias="SERENA_ALLOWED_ORIGIN_REGEX",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
