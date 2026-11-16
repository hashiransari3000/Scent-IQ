"""Vercel serverless entrypoint for the ScentIQ FastAPI service.

The FastAPI preset looks for a module-level ``app`` object at the project root.
The real application lives in ``services/api/app`` and the ML package in
``ml/src``; this file only wires those paths up and re-exports the app.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
for path in (ROOT / "ml" / "src", ROOT / "services" / "api"):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from app.main import app  # noqa: E402,F401
