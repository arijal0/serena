"""Thin, deterministic wrapper around the Google Gen AI SDK.

All three agents share one client and one `generate_structured` entrypoint that:
  * pins temperature/top_p low for reproducibility,
  * forces JSON output constrained to a Pydantic `response_schema`,
  * validates + parses the result into the typed model,
  * retries once on transient/parse failures.
"""

from __future__ import annotations

import logging
from typing import Type, TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError

from app.config import get_settings

logger = logging.getLogger("serena.gemini")

T = TypeVar("T", bound=BaseModel)

_client: genai.Client | None = None


def get_client() -> genai.Client:
    """Lazily construct a singleton genai client."""
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Copy backend/.env.example to backend/.env "
                "and add your key from https://aistudio.google.com/apikey"
            )
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def generate_structured(
    *,
    system_instruction: str,
    user_content: str,
    response_schema: Type[T],
    max_retries: int = 1,
) -> T:
    """Run a single deterministic, schema-constrained generation.

    Returns a validated instance of `response_schema`.
    """
    settings = get_settings()
    client = get_client()

    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=settings.temperature,
        top_p=settings.top_p,
        max_output_tokens=settings.max_output_tokens,
        response_mime_type="application/json",
        response_schema=response_schema,
        seed=42,
    )

    last_error: Exception | None = None
    for attempt in range(max_retries + 1):
        try:
            response = client.models.generate_content(
                model=settings.model,
                contents=user_content,
                config=config,
            )

            # Preferred path: SDK already parsed into the Pydantic model.
            parsed = getattr(response, "parsed", None)
            if isinstance(parsed, response_schema):
                return parsed

            # Fallback: validate raw JSON text ourselves.
            text = (response.text or "").strip()
            if text:
                return response_schema.model_validate_json(text)

            raise ValueError("Empty response from model.")
        except (ValidationError, ValueError) as exc:
            last_error = exc
            logger.warning("Structured generation attempt %d failed: %s", attempt + 1, exc)
        except Exception as exc:  # network / API errors
            last_error = exc
            logger.warning("Model call attempt %d failed: %s", attempt + 1, exc)

    raise RuntimeError(f"generate_structured failed after retries: {last_error}")
