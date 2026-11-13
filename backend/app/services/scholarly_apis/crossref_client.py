import re
from typing import List, Dict, Any, Optional
import httpx
from backend.app.core.config import settings
from backend.app.services.scholarly_apis.base import (
    ScholarlyProvider,
    RateLimitExceededError,
    ProviderUnavailableError,
)

def clean_jats_xml(text: Optional[str]) -> str:
    """Removes JATS XML tags (<jats:p>, <jats:italic>, etc.) from Crossref abstracts."""
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", clean).strip()

class CrossrefProvider(ScholarlyProvider):
    """
    Crossref REST API scholarly metadata provider.
    Participates in the Crossref Polite Pool via configurable mailto header.
    """

    @property
    def provider_id(self) -> str:
        return "crossref"

    @property
    def display_name(self) -> str:
        return "Crossref Metadata Service"

    @property
    def attribution(self) -> str:
        return "Scholarly metadata provided by Crossref under the Crossref Metadata Retrieval Terms of Service."

    @property
    def terms_of_service_url(self) -> str:
        return "https://www.crossref.org/documentation/retrieve-metadata/rest-api/"

    def _headers(self) -> Dict[str, str]:
        email = settings.CROSSREF_EMAIL or "contact@researchrabbit.ai"
        return {
            "User-Agent": f"ResearchRabbitAI/{settings.VERSION} (mailto:{email})",
            "Accept": "application/json",
        }

    def _map_work(self, item: Dict[str, Any]) -> Dict[str, Any]:
        authors = []
        for a in item.get("author", []):
            given = a.get("given", "").strip()
            family = a.get("family", "").strip()
            name = f"{given} {family}".strip() if given or family else a.get("name", "Author")
            affils = a.get("affiliation", [])
            affil_name = affils[0].get("name") if affils and isinstance(affils[0], dict) else None
            authors.append({
                "name": name,
                "affiliation": affil_name
            })

        titles = item.get("title", [])
        title = titles[0].strip() if titles else "Untitled Crossref Work"

        containers = item.get("container-title", [])
        venue = containers[0].strip() if containers else (item.get("publisher") or "Crossref Peer-Reviewed Work")

        doi = item.get("DOI")
        abstract = clean_jats_xml(item.get("abstract"))
        citation_count = item.get("is-referenced-by-count", 0)
        reference_count = item.get("references-count", 0)

        # Extract publication year from date-parts
        year = 2024
        for date_field in ["published", "published-print", "published-online", "created"]:
            date_parts = item.get(date_field, {}).get("date-parts", [])
            if date_parts and date_parts[0] and isinstance(date_parts[0][0], int):
                year = date_parts[0][0]
                break

        # Check for open access links
        pdf_url = None
        for link in item.get("link", []):
            if "pdf" in link.get("content-type", "").lower():
                pdf_url = link.get("URL")
                break

        subjects = item.get("subject", [])
        raw_id = doi.replace("/", "-") if doi else f"cr-{item.get('prefix', '0')}-{item.get('member', '0')}"

        return {
            "id": f"crossref-{raw_id}",
            "title": title,
            "authors": authors or [{"name": "Crossref Contributor"}],
            "abstract": abstract or "Abstract not indexed by Crossref for this record.",
            "year": year,
            "venue": venue,
            "doi": doi,
            "citation_count": citation_count,
            "reference_count": reference_count,
            "fields_of_study": subjects[:4] if subjects else ["Multidisciplinary"],
            "open_access_pdf_url": pdf_url,
            "tldr": (abstract[:160] + "...") if abstract else f"Published in {venue} ({year}).",
            "source": "crossref",
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

        url = f"https://api.crossref.org/works?query={clean_query}&rows={limit}"

        if filters:
            crossref_filters = []
            if filters.get("year_start"):
                crossref_filters.append(f"from-pub-date:{filters['year_start']}-01-01")
            if filters.get("year_end"):
                crossref_filters.append(f"until-pub-date:{filters['year_end']}-12-31")
            if crossref_filters:
                url += f"&filter={','.join(crossref_filters)}"

        async with httpx.AsyncClient(timeout=9.0) as client:
            try:
                resp = await client.get(url, headers=self._headers())
                if resp.status_code == 429:
                    retry_after = int(resp.headers.get("Retry-After", "5"))
                    raise RateLimitExceededError("Crossref", retry_after=retry_after)
                if resp.status_code >= 500:
                    raise ProviderUnavailableError("Crossref", f"HTTP {resp.status_code}")
                if resp.status_code != 200:
                    return []

                data = resp.json()
                items = data.get("message", {}).get("items", [])
                return [self._map_work(item) for item in items]
            except (RateLimitExceededError, ProviderUnavailableError):
                raise
            except httpx.TimeoutException:
                raise ProviderUnavailableError("Crossref", "Request timed out")
            except Exception:
                return []

    async def get_by_doi(self, doi: str) -> Optional[Dict[str, Any]]:
        clean_doi = doi.replace("https://doi.org/", "").replace("http://doi.org/", "").strip()
        if not clean_doi:
            return None

        url = f"https://api.crossref.org/works/{clean_doi}"
        async with httpx.AsyncClient(timeout=9.0) as client:
            try:
                resp = await client.get(url, headers=self._headers())
                if resp.status_code == 200:
                    data = resp.json()
                    item = data.get("message", {})
                    return self._map_work(item)
                return None
            except Exception:
                return None

    async def get_paper(self, paper_id: str) -> Optional[Dict[str, Any]]:
        clean_id = paper_id.replace("crossref-", "").strip()
        doi = clean_id.replace("-", "/")
        return await self.get_by_doi(doi)

# Singleton instance
crossref_provider = CrossrefProvider()
crossref_client = crossref_provider
