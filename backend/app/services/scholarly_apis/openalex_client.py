import re
from typing import List, Dict, Any, Optional
import httpx
from backend.app.core.config import settings
from backend.app.services.scholarly_apis.base import (
    ScholarlyProvider,
    RateLimitExceededError,
    ProviderUnavailableError,
)

def reconstruct_openalex_abstract(inverted_index: Optional[Dict[str, List[int]]]) -> str:
    if not inverted_index:
        return ""
    words_positions = []
    for word, positions in inverted_index.items():
        for pos in positions:
            words_positions.append((pos, word))
    words_positions.sort(key=lambda x: x[0])
    return " ".join([wp[1] for wp in words_positions])

class OpenAlexProvider(ScholarlyProvider):
    """
    OpenAlex API scholarly metadata provider.
    Participates in the OpenAlex polite pool via configurable email header.
    """

    @property
    def provider_id(self) -> str:
        return "openalex"

    @property
    def display_name(self) -> str:
        return "OpenAlex Scholarly Graph"

    @property
    def attribution(self) -> str:
        return "Scholarly metadata provided by OpenAlex (OurResearch) under CC0 Public Domain Dedication."

    @property
    def terms_of_service_url(self) -> str:
        return "https://openalex.org/tos"

    def _headers(self) -> Dict[str, str]:
        email = settings.OPENALEX_EMAIL or "contact@researchrabbit.ai"
        return {
            "User-Agent": f"ResearchRabbitAI/{settings.VERSION} (mailto:{email})",
            "Accept": "application/json",
        }

    def _map_work(self, item: Dict[str, Any]) -> Dict[str, Any]:
        authors = []
        for a in item.get("authorships", []):
            inst_list = a.get("institutions") or []
            affil = inst_list[0].get("display_name") if inst_list else None
            authors.append({
                "name": a.get("author", {}).get("display_name", "Author"),
                "affiliation": affil
            })

        abstract = reconstruct_openalex_abstract(item.get("abstract_inverted_index"))
        doi = item.get("doi", "").replace("https://doi.org/", "") if item.get("doi") else None
        primary_loc = item.get("primary_location") or {}
        primary_source = primary_loc.get("source") or {}
        pdf_url = item.get("open_access", {}).get("oa_url") or primary_loc.get("pdf_url")
        concepts = [c.get("display_name") for c in item.get("concepts", [])[:4]]
        venue_name = primary_source.get("display_name") or "Peer-Reviewed Venue"
        raw_id = item.get("id", "").replace("https://openalex.org/", "")

        return {
            "id": f"openalex-{raw_id}",
            "title": (item.get("title") or "Untitled Academic Work").strip(),
            "authors": authors or [{"name": "Academic Researcher"}],
            "abstract": abstract or "Abstract not available for this record.",
            "year": item.get("publication_year") or 2024,
            "venue": venue_name,
            "doi": doi,
            "citation_count": item.get("cited_by_count", 0),
            "reference_count": item.get("referenced_works_count", 0),
            "fields_of_study": concepts or ["Interdisciplinary"],
            "open_access_pdf_url": pdf_url,
            "tldr": (abstract[:160] + "...") if abstract else "Academic publication indexed by OpenAlex.",
            "source": "openalex",
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

        url = f"https://api.openalex.org/works?search={clean_query}&per-page={limit}&mailto={settings.OPENALEX_EMAIL}"
        
        # Apply filters if present
        if filters:
            filter_clauses = []
            if filters.get("year_start"):
                filter_clauses.append(f"from_publication_date:{filters['year_start']}-01-01")
            if filters.get("year_end"):
                filter_clauses.append(f"to_publication_date:{filters['year_end']}-12-31")
            if filters.get("open_access"):
                filter_clauses.append("is_oa:true")
            if filter_clauses:
                url += f"&filter={','.join(filter_clauses)}"

        async with httpx.AsyncClient(timeout=4.0) as client:
            try:
                resp = await client.get(url, headers=self._headers())
                if resp.status_code == 429:
                    retry_after = int(resp.headers.get("Retry-After", "5"))
                    raise RateLimitExceededError("OpenAlex", retry_after=retry_after)
                if resp.status_code >= 500:
                    raise ProviderUnavailableError("OpenAlex", f"HTTP {resp.status_code}")
                if resp.status_code != 200:
                    return []

                data = resp.json()
                return [self._map_work(item) for item in data.get("results", [])]
            except (RateLimitExceededError, ProviderUnavailableError):
                raise
            except httpx.TimeoutException:
                raise ProviderUnavailableError("OpenAlex", "Request timed out")
            except Exception as e:
                # Log error and return empty for non-critical query failures
                return []

    async def get_by_doi(self, doi: str) -> Optional[Dict[str, Any]]:
        clean_doi = doi.replace("https://doi.org/", "").replace("http://doi.org/", "").strip()
        if not clean_doi:
            return None

        url = f"https://api.openalex.org/works/https://doi.org/{clean_doi}?mailto={settings.OPENALEX_EMAIL}"
        async with httpx.AsyncClient(timeout=4.0) as client:
            try:
                resp = await client.get(url, headers=self._headers())
                if resp.status_code == 200:
                    return self._map_work(resp.json())
                return None
            except Exception:
                return None

    async def get_paper(self, paper_id: str) -> Optional[Dict[str, Any]]:
        clean_id = paper_id.replace("openalex-", "").strip()
        url = f"https://api.openalex.org/works/{clean_id}?mailto={settings.OPENALEX_EMAIL}"
        async with httpx.AsyncClient(timeout=4.0) as client:
            try:
                resp = await client.get(url, headers=self._headers())
                if resp.status_code == 200:
                    return self._map_work(resp.json())
                return None
            except Exception:
                return None

# Singleton instance
openalex_provider = OpenAlexProvider()
openalex_client = openalex_provider
