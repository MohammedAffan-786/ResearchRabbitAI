from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.dependencies import get_db, get_optional_current_user_id, rate_limit_global
from backend.app.services.search.search_service import search_service
from backend.app.services.scholarly_apis import (
    scholarly_orchestrator,
    AllScholarlyProvidersFailedError,
)
from backend.app.core.cache import scholarly_cache
from backend.app.schemas.search import SearchResponse
from backend.app.schemas.paper import PaperBrief

router = APIRouter(tags=["Search"], dependencies=[Depends(rate_limit_global)])

def serialize_paper_model(p) -> PaperBrief:
    authors_data = p.authors or []
    if not authors_data:
        try:
            if hasattr(p, "author_associations") and p.author_associations:
                authors_data = [
                    {"name": assoc.author.name, "affiliation": assoc.author.affiliation}
                    for assoc in p.author_associations if getattr(assoc, "author", None)
                ]
        except Exception:
            pass

    fields_data = p.fields_of_study or []
    if not fields_data:
        try:
            if hasattr(p, "topic_associations") and p.topic_associations:
                fields_data = [assoc.topic.name for assoc in p.topic_associations if getattr(assoc, "topic", None)]
        except Exception:
            pass

    return PaperBrief(
        id=p.id,
        title=p.title,
        authors=authors_data,
        abstract=p.abstract or "",
        year=p.year,
        venue=p.venue,
        doi=p.doi,
        arxivId=p.arxiv_id,
        citationCount=p.citation_count or 0,
        referenceCount=p.reference_count or 0,
        fieldsOfStudy=fields_data,
        openAccessPdfUrl=p.open_access_pdf_url,
        tldr=p.tldr,
        source=p.source or "local",
        readingStatus=p.reading_status or "to-read",
        userRating=p.user_rating or 0,
        tags=p.tags or [],
        userNotes=p.user_notes,
        isUploaded=p.source == "upload" or bool(getattr(p, "_uploaded_documents_cached", False)),
        hasFullText=bool((p.pdf_extracted and p.pdf_extracted.get("full_text")) or p.source == "upload" or p.open_access_pdf_url),
        dateAdded=p.date_added.isoformat() if p.date_added else None
    )

@router.get("/search/providers")
def list_scholarly_providers():
    """Returns available scholarly providers, attributions, and cache stats."""
    return {
        "providers": scholarly_orchestrator.list_providers(),
        "cacheStats": scholarly_cache.stats(),
    }

@router.get("/search/doi/{doi:path}")
async def resolve_doi_metadata(doi: str):
    """Resolves authentic scholarly metadata for a DOI via Crossref, OpenAlex, or Semantic Scholar."""
    clean_doi = doi.strip()
    if clean_doi.startswith("https://doi.org/"):
        clean_doi = clean_doi[len("https://doi.org/"):]
    elif clean_doi.startswith("http://dx.doi.org/"):
        clean_doi = clean_doi[len("http://dx.doi.org/"):]
    elif clean_doi.startswith("doi:"):
        clean_doi = clean_doi[len("doi:"):]

    clean_doi = clean_doi.strip()
    # Basic DOI validation: must start with 10. and contain a slash
    if not clean_doi.startswith("10.") or "/" not in clean_doi:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid DOI format '{doi}'. DOIs must start with '10.' followed by registrant code and suffix."
        )

    paper = await scholarly_orchestrator.resolve_doi(clean_doi)
    if not paper:
        raise HTTPException(status_code=404, detail=f"No scholarly record found for DOI '{clean_doi}'.")
    return paper

@router.get("/papers/search", response_model=SearchResponse)
@router.get("/search", response_model=SearchResponse)
async def search_papers(
    q: Optional[str] = Query(None, max_length=500, description="Natural language search query"),
    yearStart: Optional[int] = Query(None, ge=1800, le=2100, description="Minimum publication year filter"),
    yearEnd: Optional[int] = Query(None, ge=1800, le=2100, description="Maximum publication year filter"),
    minCitations: Optional[int] = Query(None, ge=0, description="Minimum citation count filter"),
    field: Optional[str] = Query(None, max_length=100, description="Field of study filter"),
    openAccess: Optional[bool] = Query(None, description="Open access only filter"),
    sortBy: Optional[str] = Query("relevance", description="relevance, citations, year"),
    provider: Optional[str] = Query("all", description="all, openalex, crossref, semantic_scholar, arxiv"),
    page: int = Query(1, ge=1, description="Page number"),
    pageSize: int = Query(20, ge=1, le=100, description="Items per page"),
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    try:
        result = await search_service.execute_search(
            db=db,
            query=q or "",
            year_start=yearStart,
            year_end=yearEnd,
            min_citations=minCitations,
            field=field,
            open_access=openAccess,
            sort_by=sortBy,
            provider=provider or "all",
            page=page,
            page_size=pageSize,
            user_id=user_id
        )
    except AllScholarlyProvidersFailedError as e:
        raise HTTPException(
            status_code=502,
            detail=f"All upstream scholarly providers failed: {e.errors}"
        )

    serialized_papers = [serialize_paper_model(p) for p in result["papers"]]

    return SearchResponse(
        papers=serialized_papers,
        totalResults=result["totalResults"],
        sourceBreakdown=result["sourceBreakdown"],
        attributions=result.get("attributions", []),
        cached=result.get("cached", False),
        queryTimeMs=result["queryTimeMs"],
        page=result["page"],
        pageSize=result["pageSize"]
    )
