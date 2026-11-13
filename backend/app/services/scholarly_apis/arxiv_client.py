import re
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional
import httpx
from backend.app.core.config import settings
from backend.app.services.scholarly_apis.base import (
    ScholarlyProvider,
    RateLimitExceededError,
    ProviderUnavailableError,
)

class ArxivProvider(ScholarlyProvider):
    """
    arXiv Open Access API provider.
    Retrieves pre-prints and post-prints across Computer Science, Physics, Math, and Quantitative Biology.
    """

    @property
    def provider_id(self) -> str:
        return "arxiv"

    @property
    def display_name(self) -> str:
        return "arXiv E-Print Archive"

    @property
    def attribution(self) -> str:
        return "Preprint data provided by arXiv.org. arXiv is maintained by Cornell University."

    @property
    def terms_of_service_url(self) -> str:
        return "https://arxiv.org/help/api/tou"

    def _map_entry(self, entry: ET.Element, ns: Dict[str, str]) -> Dict[str, Any]:
        title_elem = entry.find("atom:title", ns)
        title = title_elem.text.strip().replace("\n", " ") if title_elem is not None and title_elem.text else "Untitled"
        title = re.sub(r"\s+", " ", title).strip()

        id_elem = entry.find("atom:id", ns)
        arxiv_raw_id = id_elem.text.strip().split("/abs/")[-1] if id_elem is not None and id_elem.text else ""
        clean_arxiv_id = re.sub(r"v\d+$", "", arxiv_raw_id)

        summary_elem = entry.find("atom:summary", ns)
        summary = summary_elem.text.strip().replace("\n", " ") if summary_elem is not None and summary_elem.text else ""
        summary = re.sub(r"\s+", " ", summary).strip()

        published_elem = entry.find("atom:published", ns)
        year = int(published_elem.text[:4]) if published_elem is not None and published_elem.text else 2024

        authors = []
        for author_elem in entry.findall("atom:author", ns):
            name_elem = author_elem.find("atom:name", ns)
            if name_elem is not None and name_elem.text:
                authors.append({"name": name_elem.text.strip()})

        pdf_url = f"https://arxiv.org/pdf/{clean_arxiv_id}.pdf" if clean_arxiv_id else None

        # Extract primary category or field
        category_elem = entry.find("atom:category", ns)
        category = category_elem.get("term", "Computer Science") if category_elem is not None else "Computer Science"

        return {
            "id": f"arxiv-{clean_arxiv_id}",
            "title": title,
            "authors": authors or [{"name": "arXiv Contributor"}],
            "abstract": summary or "Abstract not available for this record.",
            "year": year,
            "venue": "arXiv Preprint",
            "arxiv_id": clean_arxiv_id,
            "citation_count": 0,
            "reference_count": 0,
            "fields_of_study": [category, "Preprint"],
            "open_access_pdf_url": pdf_url,
            "tldr": (summary[:160] + "...") if summary else "Preprint published to arXiv.",
            "source": "arxiv",
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

        url = f"http://export.arxiv.org/api/query?search_query=all:{clean_query}&start=0&max_results={limit}&sortBy=relevance&sortOrder=descending"
        async with httpx.AsyncClient(timeout=9.0) as client:
            try:
                resp = await client.get(url, headers={"User-Agent": f"ResearchRabbitAI/{settings.VERSION}"})
                if resp.status_code == 429:
                    raise RateLimitExceededError("arXiv", retry_after=5)
                if resp.status_code != 200:
                    return []

                root = ET.fromstring(resp.text)
                ns = {"atom": "http://www.w3.org/2005/Atom"}
                return [self._map_entry(entry, ns) for entry in root.findall("atom:entry", ns)]
            except (RateLimitExceededError, ProviderUnavailableError):
                raise
            except httpx.TimeoutException:
                raise ProviderUnavailableError("arXiv", "Request timed out")
            except Exception:
                return []

    async def get_by_doi(self, doi: str) -> Optional[Dict[str, Any]]:
        # arXiv query by DOI
        url = f"http://export.arxiv.org/api/query?search_query=doi:{doi}&max_results=1"
        async with httpx.AsyncClient(timeout=9.0) as client:
            try:
                resp = await client.get(url, headers={"User-Agent": f"ResearchRabbitAI/{settings.VERSION}"})
                if resp.status_code == 200:
                    root = ET.fromstring(resp.text)
                    ns = {"atom": "http://www.w3.org/2005/Atom"}
                    entries = root.findall("atom:entry", ns)
                    if entries:
                        return self._map_entry(entries[0], ns)
                return None
            except Exception:
                return None

    async def get_paper(self, paper_id: str) -> Optional[Dict[str, Any]]:
        clean_id = paper_id.replace("arxiv-", "").strip()
        url = f"http://export.arxiv.org/api/query?id_list={clean_id}"
        async with httpx.AsyncClient(timeout=9.0) as client:
            try:
                resp = await client.get(url, headers={"User-Agent": f"ResearchRabbitAI/{settings.VERSION}"})
                if resp.status_code == 200:
                    root = ET.fromstring(resp.text)
                    ns = {"atom": "http://www.w3.org/2005/Atom"}
                    entries = root.findall("atom:entry", ns)
                    if entries:
                        return self._map_entry(entries[0], ns)
                return None
            except Exception:
                return None

# Singleton instance
arxiv_provider = ArxivProvider()
arxiv_client = arxiv_provider
