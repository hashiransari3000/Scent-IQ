"""Environment-backed settings with safe local defaults."""

from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_MODEL_DIR = ROOT / "ml" / "artifacts"

APP_ENV = os.getenv("APP_ENV", "development")
MODEL_DIR = Path(os.getenv("MODEL_DIR", str(DEFAULT_MODEL_DIR)))
SENTRY_DSN = os.getenv("SENTRY_DSN", "").strip()
RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "120"))
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]
