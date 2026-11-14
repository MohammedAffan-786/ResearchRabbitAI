from typing import List, Dict, Any, Optional
import httpx
from backend.app.core.config import settings
from backend.app.services.scholarly_apis.base import (
    ScholarlyProvider,
    RateLimitExceededError,
    ProviderUnavailableError,
)

class SemanticScholarProvider(ScholarlyProvider):
    """
    Semantic Scholar Academic Graph API provider.
    Supports optional SEMANTIC_SCHOLAR_API_KEY for higher rate limits.
    """

    @property
    def provider_id(self) -> str:
        return "semantic_scholar"

    @property
    def display_name(self) -> str:
        return "Semantic Scholar (AI2)"

    @property
    def attribution(self) -> str:
        return "Scholarly metadata provided by Semantic Scholar (Allen Institute for AI) under the S2 API Terms of Service."

    @property
    def terms_of_service_url(self) -> str:
        return "https://www.semanticscholar.org/product/api/terms"

    def _headers(self) -> Dict[str, str]:
        headers = {
            "User-Agent": f"ResearchRabbitAI/{settings.VERSION} (contact@researchrabbit.ai)",
            "Accept": "application/json",
        }
        if settings.SEMANTIC_SCHOLAR_API_KEY:
            headers["x-api-key"] = settings.SEMANTIC_SCHOLAR_API_KEY
        return headers

    def _map_work(self, item: Dict[str, Any]) -> Dict[str, Any]:
        authors = [{"name": a.get("name", "Author"), "authorId": a.get("authorId")} for a in item.get("authors", [])]
        ext_ids = item.get("externalIds") or {}
        doi = ext_ids.get("DOI")
        arxiv_id = ext_ids.get("ArXiv")
        oa_pdf = item.get("openAccessPdf") or {}
        pdf_url = oa_pdf.get("url")
        fields = item.get("fieldsOfStudy") or ["Computer Science"]
        abstract = item.get("abstract") or ""
        paper_id = item.get("paperId", "")

        return {
            "id": f"s2-{paper_id[:16]}",
            "title": (item.get("title") or "Untitled Paper").strip(),
            "authors": authors or [{"name": "Academic Researcher"}],
            "abstract": abstract or "Abstract not available for this record.",
            "year": item.get("year") or 2024,
            "venue": item.get("venue") or "Semantic Scholar Corpus",
            "doi": doi,
            "arxiv_id": arxiv_id,
            "citation_count": item.get("citationCount", 0),
            "reference_count": item.get("referenceCount", 0),
            "fields_of_study": fields,
            "open_access_pdf_url": pdf_url,
            "tldr": (abstract[:160] + "...") if abstract else "Academic manuscript indexed by Semantic Scholar.",
            "source": "semantic_scholar",
            "provider_attribution": self.attribution,
        }

    async def search(
        self,
        query: str,
        limit: int = 15,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        clean_query = query.strip()
        if not clean_query:
            return []

        fields_param = "title,authors,abstract,year,venue,citationCount,referenceCount,openAccessPdf,externalIds,fieldsOfStudy"
        url = f"https://api.semanticscholar.org/graph/v1/paper/search?query={clean_query}&limit={limit}&fields={fields_param}"

        if filters and filters.get("year_start") and filters.get("year_end"):
            url += f"&year={filters['year_start']}-{filters['year_end']}"
        elif filters and filters.get("year_start"):
            url += f"&year={filters['year_start']}-"

        async with httpx.AsyncClient(timeout=4.0) as client:
            try:
                resp = await client.get(url, headers=self._headers())
                if resp.status_code == 429:
                    retry_after = int(resp.headers.get("Retry-After", "10"))
                    raise RateLimitExceededError("SemanticScholar", retry_after=retry_after)
                if resp.status_code >= 500:
                    raise ProviderUnavailableError("SemanticScholar", f"HTTP {resp.status_code}")
                if resp.status_code != 200:
                    return []

                data = resp.json()
                return [self._map_work(item) for item in data.get("data", [])]
            except (RateLimitExceededError, ProviderUnavailableError):
                raise
            except httpx.TimeoutException:
                raise ProviderUnavailableError("SemanticScholar", "Request timed out")
            except Exception:
                return []

    async def get_by_doi(self, doi: str) -> Optional[Dict[str, Any]]:
        clean_doi = doi.replace("https://doi.org/", "").replace("http://doi.org/", "").strip()
        if not clean_doi:
            return None

        fields_param = "title,authors,abstract,year,venue,citationCount,referenceCount,openAccessPdf,externalIds,fieldsOfStudy"
        url = f"https://api.semanticscholar.org/graph/v1/paper/DOI:{clean_doi}?fields={fields_param}"
        async with httpx.AsyncClient(timeout=4.0) as client:
            try:
                resp = await client.get(url, headers=self._headers())
                if resp.status_code == 200:
                    return self._map_work(resp.json())
                return None
            except Exception:
                return None

    async def get_paper(self, paper_id: str) -> Optional[Dict[str, Any]]:
        clean_id = paper_id.replace("s2-", "").strip()
        fields_param = "title,authors,abstract,year,venue,citationCount,referenceCount,openAccessPdf,externalIds,fieldsOfStudy"
        url = f"https://api.semanticscholar.org/graph/v1/paper/{clean_id}?fields={fields_param}"
        async with httpx.AsyncClient(timeout=4.0) as client:
            try:
                resp = await client.get(url, headers=self._headers())
                if resp.status_code == 200:
                    return self._map_work(resp.json())
                return None
            except Exception:
                return None

# Singleton instance
semantic_scholar_provider = SemanticScholarProvider()
semantic_scholar_client = semantic_scholar_provider
