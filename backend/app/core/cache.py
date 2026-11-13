import time
import asyncio
from typing import Any, Optional, Dict, Tuple
from backend.app.core.config import settings

class InMemoryTTLCache:
    """
    Asynchronous in-memory TTL (Time-To-Live) cache with automatic expiration.
    Reduces external API requests for scholarly searches, DOI resolutions, and embeddings.
    """
    def __init__(self, default_ttl_seconds: int = 3600):
        self._cache: Dict[str, Tuple[Any, float]] = {}
        self._default_ttl = default_ttl_seconds
        self._lock = asyncio.Lock()
        self._hits = 0
        self._misses = 0

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            item = self._cache.get(key)
            if not item:
                self._misses += 1
                return None
            val, expiry = item
            if time.time() > expiry:
                del self._cache[key]
                self._misses += 1
                return None
            self._hits += 1
            return val

    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        async with self._lock:
            ttl = ttl_seconds if ttl_seconds is not None else self._default_ttl
            expiry = time.time() + ttl
            self._cache[key] = (value, expiry)

    async def delete(self, key: str) -> bool:
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    async def clear(self) -> None:
        async with self._lock:
            self._cache.clear()
            self._hits = 0
            self._misses = 0

    async def cleanup_expired(self) -> int:
        """Evicts expired keys and returns count of evicted items."""
        now = time.time()
        async with self._lock:
            expired_keys = [k for k, (_, exp) in self._cache.items() if now > exp]
            for k in expired_keys:
                del self._cache[k]
            return len(expired_keys)

    def stats(self) -> Dict[str, Any]:
        return {
            "size": len(self._cache),
            "hits": self._hits,
            "misses": self._misses,
            "default_ttl_seconds": self._default_ttl,
        }

# Global cache instances
scholarly_cache = InMemoryTTLCache(default_ttl_seconds=settings.SCHOLARLY_CACHE_TTL_SECONDS)
embedding_cache = InMemoryTTLCache(default_ttl_seconds=86400) # 24h for embeddings
