import asyncio
import hashlib
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from backend.app.core.config import settings
from backend.app.core.cache import scholarly_cache
from backend.app.services.scholarly_apis.base import (
    ScholarlyProvider,
    ScholarlyProviderError,
    RateLimitExceededError,
    ProviderUnavailableError,
)
from backend.app.services.scholarly_apis.openalex_client import openalex_provider
from backend.app.services.scholarly_apis.crossref_client import crossref_provider
from backend.app.services.scholarly_apis.semantic_scholar_client import semantic_scholar_provider
from backend.app.services.scholarly_apis.arxiv_client import arxiv_provider

logger = logging.getLogger(__name__)

class AllScholarlyProvidersFailedError(Exception):
    """Raised when every requested scholarly metadata provider fails or times out."""
    def __init__(self, errors: Dict[str, str]):
        self.errors = errors
        error_summary = "; ".join([f"{p}: {e}" for p, e in errors.items()])
        super().__init__(f"All scholarly literature providers failed: {error_summary}")

class ScholarlySearchOrchestrator:
    """
    Orchestrates search and metadata retrieval across scholarly literature providers:
    OpenAlex, Crossref, Semantic Scholar, and arXiv.
    
    Provides:
    - Provider abstraction and switching without business logic modifications.
    - Caching layer to eliminate unnecessary external API calls.
    - Resilient failover between providers when rate-limits or network failures occur.
    - Strict authentic scholarly evidence policy (no silent fake results).
    """

    def __init__(
        self,
    ):
        self._providers: Dict[str, ScholarlyProvider] = {
            "openalex": openalex_provider,
            "crossref": crossref_provider,
            "semantic_scholar": semantic_scholar_provider,
            "arxiv": arxiv_provider,
        }
        self._provider_cooldowns: Dict[str, float] = {}

    def get_provider(self, provider_id: str) -> Optional[ScholarlyProvider]:
        return self._providers.get(provider_id.lower())

    def list_providers(self) -> List[Dict[str, Any]]:
        """Returns details on all integrated scholarly providers, status, and legal attributions."""
        return [
            {
                "id": p.provider_id,
                "name": p.display_name,
                "attribution": p.attribution,
                "terms_of_service": p.terms_of_service_url,
                "available": p.is_available,
            }
            for p in self._providers.values()
        ]

    def _generate_cache_key(self, prefix: str, **kwargs) -> str:
        serialized = json.dumps(kwargs, sort_keys=True)
        h = hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:16]
        return f"{prefix}:{h}"

    async def search(
        self,
        query: str,
        limit_per_provider: int = 10,
        provider_name: Optional[str] = "all",
        filters: Optional[Dict[str, Any]] = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Execute literature search with caching, concurrency, and failover.
        """
        clean_q = query.strip() if query else ""
        if not clean_q:
            return {"papers": [], "source_breakdown": {}, "attributions": []}

        # Check Cache
        cache_key = self._generate_cache_key(
            "scholarly_search",
            query=clean_q,
            provider=provider_name,
            limit=limit_per_provider,
            filters=filters or {}
        )

        if use_cache:
            cached_res = await scholarly_cache.get(cache_key)
            if cached_res is not None:
                logger.info(f"Scholarly cache hit for query: '{clean_q[:30]}'")
                cached_res["cached"] = True
                return cached_res

        # Select target providers
        import time
        now = time.time()

        targets: List[ScholarlyProvider] = []
        if provider_name and provider_name != "all":
            p = self.get_provider(provider_name)
            if not p:
                raise ValueError(f"Unknown scholarly provider '{provider_name}'. Supported: {list(self._providers.keys())}")
            targets = [p]
        else:
            # Default order: OpenAlex, Crossref, Semantic Scholar, arXiv (filtering out rate-limited providers)
            all_candidates = [
                openalex_provider,
                crossref_provider,
                semantic_scholar_provider,
                arxiv_provider,
            ]
            targets = [p for p in all_candidates if now >= self._provider_cooldowns.get(p.provider_id, 0.0)]
            if not targets:
                targets = [openalex_provider, crossref_provider]

        # Execute searches concurrently with timeout protection
        async def fetch_from_provider(provider: ScholarlyProvider) -> Tuple[str, Any]:
            try:
                res = await asyncio.wait_for(
                    provider.search(clean_q, limit=limit_per_provider, filters=filters),
                    timeout=3.5
                )
                return provider.provider_id, res
            except RateLimitExceededError as rle:
                logger.warning(f"Provider {provider.provider_id} rate-limited. Setting 60s cooldown.")
                self._provider_cooldowns[provider.provider_id] = time.time() + 60.0
                return provider.provider_id, rle
            except asyncio.TimeoutError:
                logger.warning(f"Provider {provider.provider_id} timed out after 3.5s.")
                return provider.provider_id, ProviderUnavailableError(provider.provider_id, "Fast query timeout")
            except Exception as e:
                logger.warning(f"Provider {provider.provider_id} query failed: {e}")
                return provider.provider_id, e

        tasks = [fetch_from_provider(p) for p in targets]
        results = await asyncio.gather(*tasks)

        all_papers: List[Dict[str, Any]] = []
        source_breakdown: Dict[str, int] = {}
        errors: Dict[str, str] = {}
        attributions: List[str] = []

        for p_id, res in results:
            if isinstance(res, list):
                all_papers.extend(res)
                source_breakdown[p_id] = len(res)
                provider_obj = self.get_provider(p_id)
                if provider_obj and provider_obj.attribution not in attributions:
                    attributions.append(provider_obj.attribution)
            elif isinstance(res, Exception):
                errors[p_id] = str(res)
                source_breakdown[p_id] = 0

        # If every requested provider failed, raise meaningful error (NEVER fake sample results)
        if not all_papers and errors and len(errors) == len(targets):
            raise AllScholarlyProvidersFailedError(errors)

        response_payload = {
            "papers": all_papers,
            "source_breakdown": source_breakdown,
            "errors": errors if errors else None,
            "attributions": attributions,
            "cached": False,
        }

        # Cache valid results
        if use_cache and all_papers:
            await scholarly_cache.set(cache_key, response_payload, ttl_seconds=settings.SCHOLARLY_CACHE_TTL_SECONDS)

        return response_payload

    async def resolve_doi(self, doi: str, use_cache: bool = True) -> Optional[Dict[str, Any]]:
        """Resolves metadata for a DOI by querying Crossref, OpenAlex, then Semantic Scholar."""
        clean_doi = doi.replace("https://doi.org/", "").replace("http://doi.org/", "").strip()
        if not clean_doi:
            return None

        cache_key = f"doi:{clean_doi}"
        if use_cache:
            cached_paper = await scholarly_cache.get(cache_key)
            if cached_paper:
                return cached_paper

        # Prioritize Crossref (authoritative DOI registrar), then OpenAlex, then Semantic Scholar
        for provider in [crossref_provider, openalex_provider, semantic_scholar_provider]:
            try:
                paper = await provider.get_by_doi(clean_doi)
                if paper:
                    if use_cache:
                        await scholarly_cache.set(cache_key, paper, ttl_seconds=86400)
                    return paper
            except Exception as e:
                logger.warning(f"Failed to resolve DOI {clean_doi} via {provider.provider_id}: {e}")

        return None

# Singleton Orchestrator
scholarly_orchestrator = ScholarlySearchOrchestrator()
