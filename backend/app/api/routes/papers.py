from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.core.dependencies import get_db, get_optional_current_user_id, rate_limit_global, get_paper_repository
from backend.app.repositories.paper_repository import PaperRepository
from backend.app.models import Paper, Collection, UserActivity
from backend.app.schemas.paper import PaperBrief, PaperUpdate, PaperDetailResponse, PaperListResponse, PaperIntelligenceResponse
from backend.app.api.routes.search import serialize_paper_model
from backend.app.workers.document_worker import extract_paper_intelligence
from backend.app.services.qdrant_sync_service import qdrant_sync_service

router = APIRouter(prefix="/papers", tags=["Papers"], dependencies=[Depends(rate_limit_global)])

@router.get("", response_model=PaperListResponse)
def list_papers(
    collectionId: Optional[str] = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    if collectionId:
        col = db.query(Collection).filter(Collection.id == collectionId).first()
        if not col:
            raise HTTPException(status_code=404, detail="Collection not found")
        all_papers = col.papers
    else:
        all_papers = db.query(Paper).all()

    total = len(all_papers)
    offset = (page - 1) * pageSize
    paginated = all_papers[offset:offset + pageSize]

    return PaperListResponse(
        papers=[serialize_paper_model(p) for p in paginated],
        total=total
    )

@router.get("/vector-sync/status")
async def get_vector_sync_status(db: Session = Depends(get_db)):
    """Audits vector synchronization status between PostgreSQL and Qdrant."""
    status_report = await qdrant_sync_service.reconcile_sync(db, auto_repair=False)
    return status_report

@router.post("/vector-sync/reconcile")
async def reconcile_vector_sync(db: Session = Depends(get_db)):
    """Actively reconciles out-of-sync PostgreSQL document chunks into Qdrant."""
    report = await qdrant_sync_service.reconcile_sync(db, auto_repair=True)
    return {
        "message": "Vector reconciliation routine completed",
        "details": report
    }

@router.get("/{paper_id}", response_model=PaperDetailResponse)
def get_paper(
    paper_id: str,
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    paper_repo: PaperRepository = Depends(get_paper_repository),
    db: Session = Depends(get_db)
):
    paper = paper_repo.get(paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    if user_id:
        act = UserActivity(
            user_id=user_id,
            activity_type="view_paper",
            entity_type="paper",
            entity_id=paper.id,
            title=f"Inspected paper: \"{paper.title[:60]}\"",
            metadata_json={"paperId": paper.id, "year": paper.year}
        )
        db.add(act)
        try:
            db.commit()
        except Exception:
            db.rollback()

    all_papers = db.query(Paper).filter(Paper.id != paper_id).all()
    earlier = [p for p in all_papers if p.year < paper.year][:4]
    later = [p for p in all_papers if p.year > paper.year][:4]
    similar = [p for p in all_papers if abs(p.year - paper.year) <= 1][:4]

    return PaperDetailResponse(
        paper=serialize_paper_model(paper),
        similar={
            "earlierWork": [serialize_paper_model(p) for p in earlier],
            "laterWork": [serialize_paper_model(p) for p in later],
            "similarWork": [serialize_paper_model(p) for p in similar]
        }
    )

@router.get("/{paper_id}/intelligence", response_model=PaperIntelligenceResponse)
async def get_paper_intelligence(
    paper_id: str,
    paper_repo: PaperRepository = Depends(get_paper_repository),
    db: Session = Depends(get_db)
):
    paper = paper_repo.get(paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    if paper.paper_intelligence and isinstance(paper.paper_intelligence, dict) and "problemStatement" in paper.paper_intelligence:
        return PaperIntelligenceResponse(
            paperId=paper.id,
            title=paper.title,
            intelligence=paper.paper_intelligence
        )

    intel = await extract_paper_intelligence(paper)
    paper.paper_intelligence = intel
    db.commit()
    db.refresh(paper)

    return PaperIntelligenceResponse(
        paperId=paper.id,
        title=paper.title,
        intelligence=paper.paper_intelligence
    )

@router.patch("/{paper_id}", response_model=PaperBrief)
def update_paper(
    paper_id: str,
    updates: PaperUpdate,
    paper_repo: PaperRepository = Depends(get_paper_repository),
    db: Session = Depends(get_db)
):
    paper = paper_repo.get(paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    if updates.reading_status is not None:
        paper.reading_status = updates.reading_status
    if updates.user_rating is not None:
        paper.user_rating = updates.user_rating
    if updates.user_notes is not None:
        paper.user_notes = updates.user_notes
    if updates.tags is not None:
        paper.tags = updates.tags

    db.commit()
    db.refresh(paper)
    return serialize_paper_model(paper)

@router.delete("/{paper_id}")
def delete_paper(
    paper_id: str,
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    paper_repo: PaperRepository = Depends(get_paper_repository)
):
    paper = paper_repo.get(paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    # Authorization ownership check: only the uploader may delete their uploaded manuscript
    if paper.uploader_id and user_id and paper.uploader_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete this uploaded document."
        )

    paper_repo.delete(paper)
    return {"success": True}
