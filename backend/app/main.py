"""Serena backend — FastAPI surface for the three-agent obstetric triage pipeline.

Endpoints
  GET  /                      → service banner
  GET  /health               → liveness + config sanity
  GET  /api/protocols        → the ACOG/MEWS red-flag catalog (for the UI legend)
  POST /api/triage/run       → run the full pipeline, return all three schemas
  POST /api/triage/stream    → run the pipeline, stream each handoff via SSE
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app import __version__
from app.config import get_settings
from app.knowledge.acog_protocols import PROTOCOL_REFS_BY_FLAG, RED_FLAGS
from app.orchestrator import run_pipeline, stream_pipeline
from app.schemas import IntakeRequest, PipelineResult

logging.basicConfig(level=logging.INFO)

settings = get_settings()

app = FastAPI(
    title="Serena — Maternal Protocol Enforcer",
    description="Three-agent obstetric triage audit pipeline (Gemini 2.5 Flash).",
    version=__version__,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.allowed_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict:
    return {
        "service": "Serena — Maternal Protocol Enforcer",
        "version": __version__,
        "model": settings.model,
        "docs": "/docs",
    }


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model": settings.model,
        "temperature": settings.temperature,
        "gemini_key_configured": bool(settings.gemini_api_key),
    }


@app.get("/api/protocols")
def protocols() -> dict:
    """Expose the red-flag catalog so the UI can render symptom cards + legend."""
    return {
        "red_flags": [
            {
                "id": rf.id,
                "label": rf.label,
                "tier": rf.tier.value,
                "associated_condition": rf.associated_condition,
                "citation": rf.citation,
                "protocol_references": list(PROTOCOL_REFS_BY_FLAG.get(rf.id, ())),
            }
            for rf in RED_FLAGS
        ]
    }


@app.post("/api/triage/run", response_model=PipelineResult)
def triage_run(request: IntakeRequest) -> PipelineResult:
    """Blocking execution of the full three-agent pipeline."""
    return run_pipeline(request)


@app.post("/api/triage/stream")
def triage_stream(request: IntakeRequest) -> StreamingResponse:
    """Streaming execution: emits SSE frames for each agent start/complete."""
    return StreamingResponse(
        stream_pipeline(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
