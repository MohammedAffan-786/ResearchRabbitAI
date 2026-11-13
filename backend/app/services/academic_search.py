from typing import List, Dict, Any, Optional
from backend.app.db.database import SessionLocal
from backend.app.db.models import Paper
from backend.app.services.scholarly_apis import (
    openalex_provider,
    crossref_provider,
    semantic_scholar_provider,
    arxiv_provider,
    scholarly_orchestrator,
)

class AcademicSearchService:
    async def search_openalex(self, query: str, limit: int = 15) -> List[Dict[str, Any]]:
        return await openalex_provider.search(query, limit=limit)

    async def search_crossref(self, query: str, limit: int = 15) -> List[Dict[str, Any]]:
        return await crossref_provider.search(query, limit=limit)

    async def search_semantic_scholar(self, query: str, limit: int = 15) -> List[Dict[str, Any]]:
        return await semantic_scholar_provider.search(query, limit=limit)

    async def search_arxiv(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        return await arxiv_provider.search(query, limit=limit)

    async def search_all_scholarly(self, query: str, limit_per_provider: int = 8) -> Dict[str, Any]:
        return await scholarly_orchestrator.search(query, limit_per_provider=limit_per_provider)

    def search_local(self, query: str) -> List[Paper]:
        db = SessionLocal()
        try:
            if not query or not query.strip():
                return db.query(Paper).limit(50).all()

            terms = query.lower().split()
            all_papers = db.query(Paper).all()
            scored = []
            for p in all_papers:
                score = 0
                title_lower = p.title.lower()
                abstract_lower = (p.abstract or "").lower()
                if query.lower() in title_lower:
                    score += 50
                for t in terms:
                    if t in title_lower:
                        score += 15
                    if t in abstract_lower:
                        score += 5
                if score > 0:
                    scored.append((score, p))
            scored.sort(key=lambda x: x[0], reverse=True)
            return [item[1] for item in scored]
        finally:
            db.close()

academic_search = AcademicSearchService()
