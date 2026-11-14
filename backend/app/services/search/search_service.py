import asyncio
import logging
import time
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)
from sqlalchemy.orm import Session
from backend.app.models import Paper, UserActivity
from backend.app.services.scholarly_apis import (
    scholarly_orchestrator,
    AllScholarlyProvidersFailedError,
)
from backend.app.services.paper_deduplication import deduplication_service
from backend.app.services.retrieval.hybrid_retriever import hybrid_retriever
from backend.app.services.qdrant_sync_service import qdrant_sync_service
from backend.app.core.cache import scholarly_cache

class SearchService:
    """
    High-speed search orchestration service combining local hybrid vector retrieval
    with external scholarly providers (OpenAlex, Crossref, Semantic Scholar, arXiv),
    automatic multi-tier deduplication, asynchronous vector indexing, caching, and filtering.
    """
    async def execute_search(
        self,
        db: Session,
        query: str,
        year_start: Optional[int] = None,
        year_end: Optional[int] = None,
        min_citations: Optional[int] = None,
        field: Optional[str] = None,
        open_access: Optional[bool] = None,
        sort_by: Optional[str] = "relevance",
        provider: Optional[str] = "all",
        page: int = 1,
        page_size: int = 20,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        start_time = time.perf_counter()
        clean_q = query.strip() if query else ""

        # High-speed search cache check
        cache_key = f"full_search:{clean_q.lower()}:{year_start}:{year_end}:{min_citations}:{field}:{open_access}:{sort_by}:{provider}:{page}:{page_size}"
        cached_payload = await scholarly_cache.get(cache_key)
        if cached_payload is not None:
            cached_payload["queryTimeMs"] = int((time.perf_counter() - start_time) * 1000)
            cached_payload["cached"] = True
            return cached_payload

        # Fetch local repository papers matched to query
        if clean_q:
            terms = clean_q.lower().split()
            all_db_papers = db.query(Paper).all()
            scored = []
            for p in all_db_papers:
                score = 0
                t_lower = (p.title or "").lower()
                a_lower = (p.abstract or "").lower()
                if clean_q.lower() in t_lower:
                    score += 50
                for t in terms:
                    if t in t_lower:
                        score += 15
                    if t in a_lower:
                        score += 5
                if score > 0:
                    scored.append((score, p))
            scored.sort(key=lambda x: x[0], reverse=True)
            local_papers = [s[1] for s in scored]
        else:
            local_papers = db.query(Paper).limit(50).all()
        source_breakdown = {"local": len(local_papers)}
        attributions = []
        is_cached = False

        external_papers = []
        if clean_q and len(clean_q) >= 2:
            filters = {
                "year_start": year_start,
                "year_end": year_end,
                "open_access": open_access,
                "field": field if field != "All Fields" else None,
            }
            try:
                orch_result = await scholarly_orchestrator.search(
                    query=clean_q,
                    limit_per_provider=8,
                    provider_name=provider or "all",
                    filters=filters,
                    use_cache=True,
                )
                external_papers = orch_result.get("papers", [])
                source_breakdown.update(orch_result.get("source_breakdown", {}))
                attributions = orch_result.get("attributions", [])
                is_cached = orch_result.get("cached", False)
            except AllScholarlyProvidersFailedError as aspe:
                logger.warning(f"All upstream scholarly providers failed or timed out: {aspe}. Falling back to local repository papers.")
                external_papers = []

        # Log User Activity asynchronously or non-blockingly
        if user_id and clean_q:
            try:
                act = UserActivity(
                    user_id=user_id,
                    activity_type="search",
                    entity_type="search_query",
                    title=f"Searched: \"{clean_q[:60]}\"",
                    metadata_json={"query": clean_q, "sort": sort_by, "provider": provider}
                )
                db.add(act)
                db.commit()
            except Exception:
                db.rollback()

        # Deduplicate external papers
        paper_map = {p.id: p for p in local_papers}
        new_sync_items = []

        for ep in external_papers:
            try:
                paper, is_new = deduplication_service.get_or_create_paper(db, ep)
                paper_map[paper.id] = paper

                if is_new and ep.get("abstract"):
                    new_sync_items.append((paper.id, ep["abstract"]))
            except Exception:
                pass

        # Asynchronously synchronize new papers in Qdrant in the background without blocking the search response
        if new_sync_items:
            async def _background_qdrant_sync(items):
                from backend.app.database.session import SessionLocal
                from backend.app.models import Paper as PaperModel
                bg_db = SessionLocal()
                try:
                    for p_id, p_abstract in items:
                        p_obj = bg_db.query(PaperModel).filter(PaperModel.id == p_id).first()
                        if p_obj:
                            try:
                                await qdrant_sync_service.sync_paper_chunks(
                                    db=bg_db,
                                    paper=p_obj,
                                    chunks_text=[p_abstract]
                                )
                            except Exception:
                                pass
                finally:
                    bg_db.close()

            asyncio.create_task(_background_qdrant_sync(new_sync_items))

        papers = list(paper_map.values())

        # Filtering
        if year_start:
            papers = [p for p in papers if p.year >= year_start]
        if year_end:
            papers = [p for p in papers if p.year <= year_end]
        if min_citations:
            papers = [p for p in papers if p.citation_count >= min_citations]
        if field and field != "All Fields":
            f_lower = field.lower()
            papers = [
                p for p in papers
                if any(f_lower in str(f).lower() for f in (p.fields_of_study or []))
            ]
        if open_access:
            papers = [p for p in papers if p.open_access_pdf_url]

        # Sorting
        if sort_by == "citations":
            papers.sort(key=lambda p: p.citation_count, reverse=True)
        elif sort_by == "year":
            papers.sort(key=lambda p: p.year, reverse=True)
        elif clean_q and len(clean_q) >= 2:
            # Rank with hybrid retriever
            try:
                fused = await hybrid_retriever.search(clean_q, papers, limit=len(papers))
                if fused:
                    fused_ids = [f["paper_id"] for f in fused]
                    papers.sort(key=lambda p: fused_ids.index(p.id) if p.id in fused_ids else 9999)
            except Exception:
                pass

        total_results = len(papers)

        # Pagination
        offset = (page - 1) * page_size
        paginated_papers = papers[offset:offset + page_size]

        elapsed_ms = int((time.perf_counter() - start_time) * 1000)

        response_payload = {
            "papers": paginated_papers,
            "totalResults": total_results,
            "sourceBreakdown": source_breakdown,
            "attributions": attributions,
            "cached": is_cached,
            "queryTimeMs": max(1, elapsed_ms),
            "page": page,
            "pageSize": page_size
        }

        # Cache search result for 300 seconds (5 minutes)
        if clean_q and paginated_papers:
            await scholarly_cache.set(cache_key, response_payload, ttl_seconds=300)

        return response_payload

search_service = SearchService()
