import time
from collections import defaultdict
from typing import Dict, List
from fastapi import Request
from backend.app.core.exceptions import RateLimitExceededException

class InMemoryRateLimiter:
    """Sliding-window in-memory rate limiter per IP or authenticated user."""
    def __init__(self, requests_per_minute: int = 120):
        self.requests_per_minute = requests_per_minute
        self.window_seconds = 60
        self.records: Dict[str, List[float]] = defaultdict(list)

    def is_allowed(self, client_key: str) -> tuple[bool, int]:
        now = time.time()
        cutoff = now - self.window_seconds

        # Clean timestamps older than 60s
        self.records[client_key] = [ts for ts in self.records[client_key] if ts > cutoff]

        if len(self.records[client_key]) >= self.requests_per_minute:
            oldest = self.records[client_key][0]
            retry_after = max(1, int(self.window_seconds - (now - oldest)))
            return False, retry_after

        self.records[client_key].append(now)
        return True, 0

    def check(self, request: Request, identifier: str = None):
        # Extract IP or token subject
        key = identifier or request.client.host if request.client else "unknown-client"
        allowed, retry_after = self.is_allowed(key)
        if not allowed:
            raise RateLimitExceededException(retry_after=retry_after)

# Standard global rate limiter instance (120 req/min for general API calls)
global_rate_limiter = InMemoryRateLimiter(requests_per_minute=180)
auth_rate_limiter = InMemoryRateLimiter(requests_per_minute=30)
upload_rate_limiter = InMemoryRateLimiter(requests_per_minute=20)
