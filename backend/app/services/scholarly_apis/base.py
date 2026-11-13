from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class ScholarlyProviderError(Exception):
    """Base exception for scholarly API provider failures."""
    def __init__(self, provider: str, message: str, status_code: Optional[int] = None):
        self.provider = provider
        self.message = message
        self.status_code = status_code
        super().__init__(f"[{provider}] {message}")

class RateLimitExceededError(ScholarlyProviderError):
    """Raised when an external API rate limit is hit (HTTP 429)."""
    def __init__(self, provider: str, retry_after: Optional[int] = None):
        msg = f"Rate limit reached. Retry after {retry_after}s." if retry_after else "Rate limit reached."
        super().__init__(provider, msg, status_code=429)
        self.retry_after = retry_after

class ProviderUnavailableError(ScholarlyProviderError):
    """Raised when an external API provider is offline, timing out, or returning 5xx."""
    def __init__(self, provider: str, message: str = "Upstream service temporarily unavailable."):
        super().__init__(provider, message, status_code=503)

class ScholarlyProvider(ABC):
    """
    Abstract Base Class for scholarly literature metadata providers.
    Ensures unified interface, rate-limit compliance, and proper attribution.
    """

    @property
    @abstractmethod
    def provider_id(self) -> str:
        """Machine identifier (e.g. 'openalex', 'crossref', 'semantic_scholar')."""
        pass

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable provider title."""
        pass

    @property
    @abstractmethod
    def attribution(self) -> str:
        """Required legal and attribution text."""
        pass

    @property
    @abstractmethod
    def terms_of_service_url(self) -> str:
        """Terms of service and API usage policy URL."""
        pass

    @property
    def is_available(self) -> bool:
        """Health check status of provider integration."""
        return True

    @abstractmethod
    async def search(
        self,
        query: str,
        limit: int = 15,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Execute natural language or keyword literature search.
        Returns unified paper dicts with title, authors, abstract, year, venue, doi, citations.
        """
        pass

    @abstractmethod
    async def get_by_doi(self, doi: str) -> Optional[Dict[str, Any]]:
        """Resolve a specific document by its Digital Object Identifier (DOI)."""
        pass

    @abstractmethod
    async def get_paper(self, paper_id: str) -> Optional[Dict[str, Any]]:
        """Fetch full metadata for a provider-specific paper ID."""
        pass
