"""Small in-memory IP rate limiter for the free single-instance deployment."""

from __future__ import annotations

import time
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limit: int = 120, window_seconds: int = 60) -> None:
        super().__init__(app)
        self.limit = limit
        self.window = window_seconds
        self.buckets: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        if request.url.path in {"/health", "/"}:
            return await call_next(request)
        forwarded = request.headers.get("x-forwarded-for", "")
        client = forwarded.split(",")[0].strip() or (
            request.client.host if request.client else "unknown"
        )
        now = time.monotonic()
        bucket = self.buckets[client]
        while bucket and now - bucket[0] > self.window:
            bucket.popleft()
        if len(bucket) >= self.limit:
            retry_after = max(1, int(self.window - (now - bucket[0])))
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down."},
                headers={"Retry-After": str(retry_after)},
            )
        bucket.append(now)
        if len(self.buckets) > 5000:
            self.buckets = defaultdict(deque, {client: bucket})
        return await call_next(request)
