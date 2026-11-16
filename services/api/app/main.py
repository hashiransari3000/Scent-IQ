"""ScentIQ FastAPI application."""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import Annotated, Any

import sentry_sdk
from fastapi import Body, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from scentiq_ml.rank import RecommendationEngine

from .rate_limit import RateLimitMiddleware
from .schemas import FilterRequest, ProfileRequest
from .settings import (
    APP_ENV,
    CORS_ORIGINS,
    MODEL_DIR,
    RATE_LIMIT_PER_MINUTE,
    SENTRY_DSN,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("scentiq.api")

if SENTRY_DSN:
    sentry_sdk.init(dsn=SENTRY_DSN, environment=APP_ENV, traces_sample_rate=0.05)

VERSION = "0.1.0"


@asynccontextmanager
async def lifespan(application: FastAPI):
    started = time.perf_counter()
    application.state.engine = None
    application.state.engine_error = None
    try:
        application.state.engine = RecommendationEngine(MODEL_DIR)
        elapsed = (time.perf_counter() - started) * 1000
        application.state.load_ms = round(elapsed, 1)
        logger.info("Recommendation engine loaded in %.0f ms", elapsed)
    except Exception as exc:  # pragma: no cover - startup guard
        application.state.engine_error = str(exc)
        logger.exception("Could not load recommendation engine")
    yield
    application.state.engine = None


app = FastAPI(
    title="ScentIQ API",
    description=(
        "Personalised fragrance recommendations from a content model, "
        "K-Means clusters and a decision tree. Catalogue data: Scento (CC BY 4.0)."
    ),
    version=VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)
app.add_middleware(RateLimitMiddleware, limit=RATE_LIMIT_PER_MINUTE, window_seconds=60)


def get_engine(request: Request) -> RecommendationEngine:
    engine = request.app.state.engine
    if engine is None:
        raise HTTPException(
            status_code=503,
            detail=f"Model is not loaded: {request.app.state.engine_error or 'unknown error'}",
        )
    return engine


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "name": "ScentIQ API",
        "version": VERSION,
        "docs": "/docs",
        "health": "/health",
        "endpoints": [
            "POST /v1/recommend",
            "POST /v1/explain/{perfume_id}",
            "GET /v1/perfumes/{perfume_id}",
            "GET /v1/perfumes/{perfume_id}/similar",
            "GET /v1/catalogue",
            "GET /v1/model/info",
            "GET /v1/taxonomy",
        ],
        "attribution": "Scento Perfume Database (CC BY 4.0)",
    }


@app.get("/health")
def health(request: Request):
    engine = request.app.state.engine
    if engine is None:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unavailable",
                "error": request.app.state.engine_error,
                "version": VERSION,
            },
        )
    return {
        "status": "ok",
        "version": VERSION,
        "environment": APP_ENV,
        "loadMs": request.app.state.load_ms,
        "perfumes": len(engine.df),
        "clusters": engine.k,
        "treeLeaves": int(engine.metrics.get("tree", {}).get("leaves") or 0),
    }


@app.post("/v1/recommend")
def recommend(
    request: Request,
    profile: Annotated[ProfileRequest, Body(...)],
) -> dict[str, Any]:
    engine = get_engine(request)
    try:
        return engine.recommend(profile.model_dump())
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/v1/explain/{perfume_id}")
def explain(
    perfume_id: str,
    request: Request,
    profile: Annotated[ProfileRequest, Body(...)],
) -> dict[str, Any]:
    engine = get_engine(request)
    try:
        return engine.explain(perfume_id, profile.model_dump())
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown perfume: {perfume_id}") from exc


@app.get("/v1/perfumes/{perfume_id}")
def perfume(perfume_id: str, request: Request) -> dict[str, Any]:
    engine = get_engine(request)
    try:
        return engine.perfume(perfume_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown perfume: {perfume_id}") from exc


@app.get("/v1/perfumes/{perfume_id}/similar")
def similar(
    perfume_id: str,
    request: Request,
    limit: Annotated[int, Query(ge=1, le=24)] = 12,
) -> dict[str, Any]:
    engine = get_engine(request)
    try:
        return {"items": engine.similar_to(perfume_id, limit)}
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown perfume: {perfume_id}") from exc


@app.get("/v1/catalogue")
def catalogue(
    request: Request,
    query: Annotated[str | None, Query(max_length=80)] = None,
    family: Annotated[list[str] | None, Query()] = None,
    season: Annotated[list[str] | None, Query()] = None,
    time: Annotated[list[str] | None, Query()] = None,
    budget_max: Annotated[int | None, Query(ge=1, le=4)] = None,
    gender: Annotated[str, Query(pattern="^(any|men|women)$")] = "any",
    limit: Annotated[int, Query(ge=1, le=100)] = 40,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> dict[str, Any]:
    engine = get_engine(request)
    filters = FilterRequest(
        query=query,
        families=family or [],
        seasons=season or [],
        times=time or [],
        budget_max=budget_max,
        gender=gender,
    )
    return engine.catalogue(filters.model_dump(), limit=limit, offset=offset)


@app.get("/v1/model/info")
def model_info(request: Request) -> dict[str, Any]:
    engine = get_engine(request)
    return engine.model_info()


@app.get("/v1/taxonomy")
def taxonomy(request: Request) -> dict[str, Any]:
    engine = get_engine(request)
    return engine.taxonomy()
