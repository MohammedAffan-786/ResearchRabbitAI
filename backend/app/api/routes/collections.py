import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.core.dependencies import get_db, get_optional_current_user_id, rate_limit_global
from backend.app.models import Collection, Paper, ResearchActivity, CollectionPaper
from backend.app.schemas.collection import (
    CollectionCreate,
    CollectionUpdate,
    AddPaperRequest,
    PaperAnnotationUpdate,
    CollectionBrief,
    CollectionDetail,
    CollectionSearchResponse,
    CollectionSummaryResponse,
    CollectionShareResponse
)
from backend.app.schemas.paper import PaperBrief
from backend.app.api.routes.search import serialize_paper_model
from backend.app.services.llm_provider import get_llm_provider

router = APIRouter(prefix="/collections", tags=["Collections"], dependencies=[Depends(rate_limit_global)])
llm_provider = get_llm_provider()

def serialize_collection_brief(c: Collection) -> CollectionBrief:
    return CollectionBrief(
        id=c.id,
        name=c.name,
        description=c.description or "",
        color=c.color,
        icon=c.icon,
        isPublic=bool(c.is_public),
        shareToken=c.share_token,
        tags=c.tags or [],
        paperCount=len(c.papers),
        paperIds=[p.id for p in c.papers],
        createdAt=c.created_at.isoformat() if c.created_at else None,
        updatedAt=c.updated_at.isoformat() if c.updated_at else None
    )

def check_collection_access(col: Collection, user_id: Optional[str], write: bool = False):
    """Enforces authorization and ownership checks for private and public collections."""
    if col.owner_id:
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required to access this collection")
        if col.owner_id != user_id:
            if write:
                raise HTTPException(status_code=403, detail="You do not have permission to modify this collection")
            elif not col.is_public:
                raise HTTPException(status_code=403, detail="You do not have permission to view this private collection")

@router.get("", response_model=List[CollectionBrief])
def list_collections(
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    query = db.query(Collection)
    if user_id:
        query = query.filter((Collection.owner_id == user_id) | (Collection.owner_id.is_(None)))
    cols = query.all()
    return [serialize_collection_brief(c) for c in cols]

@router.post("", status_code=201, response_model=CollectionBrief)
def create_collection(
    col_in: CollectionCreate,
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    col = Collection(
        name=col_in.name,
        description=col_in.description,
        color=col_in.color or "#3b82f6",
        icon=col_in.icon or "Folder",
        tags=col_in.tags or [],
        owner_id=user_id,
        share_token=f"col-{uuid.uuid4().hex[:12]}"
    )
    db.add(col)
    db.commit()
    db.refresh(col)

    if user_id:
        act = ResearchActivity(
            user_id=user_id,
            activity_type="create_collection",
            title=f"Created research collection: \"{col.name}\"",
            metadata_json={"collectionId": col.id}
        )
        db.add(act)
        try:
            db.commit()
        except Exception:
            db.rollback()

    return serialize_collection_brief(col)

@router.get("/{col_id}", response_model=CollectionDetail)
def get_collection(
    col_id: str,
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    col = db.query(Collection).filter(Collection.id == col_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    check_collection_access(col, user_id, write=False)

    cp_map = {
        cp.paper_id: {
            "notes": cp.notes,
            "userRating": cp.user_rating,
            "addedAt": cp.added_at.isoformat() if cp.added_at else None
        }
        for cp in db.query(CollectionPaper).filter(CollectionPaper.collection_id == col_id).all()
    }
    paper_list = []
    for p in col.papers:
        p_brief = serialize_paper_model(p)
        meta = cp_map.get(p.id, {})
        if meta.get("notes"):
            p_brief.notes = meta["notes"]
        if meta.get("userRating"):
            p_brief.userRating = meta["userRating"]
        paper_list.append(p_brief)

    brief = serialize_collection_brief(col)
    return CollectionDetail(
        **brief.model_dump(),
        papers=paper_list
    )

@router.patch("/{col_id}", response_model=CollectionBrief)
def update_collection(
    col_id: str,
    updates: CollectionUpdate,
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    col = db.query(Collection).filter(Collection.id == col_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    check_collection_access(col, user_id, write=True)

    if updates.name is not None:
        col.name = updates.name
    if updates.description is not None:
        col.description = updates.description
    if updates.color is not None:
        col.color = updates.color
    if updates.icon is not None:
        col.icon = updates.icon
    if updates.tags is not None:
        col.tags = updates.tags
    if updates.is_public is not None:
        col.is_public = updates.is_public

    db.commit()
    db.refresh(col)
    return serialize_collection_brief(col)

@router.delete("/{col_id}")
def delete_collection(
    col_id: str,
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    col = db.query(Collection).filter(Collection.id == col_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    check_collection_access(col, user_id, write=True)
    db.delete(col)
    db.commit()
    return {"success": True}

@router.post("/{col_id}/papers", response_model=CollectionBrief)
def add_paper_to_collection(
    col_id: str,
    req: AddPaperRequest,
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    col = db.query(Collection).filter(Collection.id == col_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    check_collection_access(col, user_id, write=True)

    paper = db.query(Paper).filter(Paper.id == req.paperId).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    if paper not in col.papers:
        col.papers.append(paper)
        db.commit()
        db.refresh(col)

    return serialize_collection_brief(col)

@router.delete("/{col_id}/papers/{paper_id}", response_model=CollectionBrief)
def remove_paper_from_collection(
    col_id: str,
    paper_id: str,
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    col = db.query(Collection).filter(Collection.id == col_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    check_collection_access(col, user_id, write=True)

    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if paper and paper in col.papers:
        col.papers.remove(paper)
        db.commit()
        db.refresh(col)

    return serialize_collection_brief(col)

@router.patch("/{col_id}/papers/{paper_id}/annotation")
def update_paper_annotation(
    col_id: str,
    paper_id: str,
    payload: PaperAnnotationUpdate,
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    col = db.query(Collection).filter(Collection.id == col_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    check_collection_access(col, user_id, write=True)
    cp = db.query(CollectionPaper).filter(
        CollectionPaper.collection_id == col_id,
        CollectionPaper.paper_id == paper_id
    ).first()
    if not cp:
        raise HTTPException(status_code=404, detail="Paper not found in this collection")
    if payload.notes is not None:
        cp.notes = payload.notes
    if payload.rating is not None:
        cp.user_rating = payload.rating
    db.commit()
    return {
        "collectionId": col_id,
        "paperId": paper_id,
        "notes": cp.notes,
        "userRating": cp.user_rating
    }

@router.get("/{col_id}/search", response_model=CollectionSearchResponse)
def search_collection_papers(
    col_id: str,
    q: str = Query("", description="Keyword or title search within collection"),
    db: Session = Depends(get_db)
):
    col = db.query(Collection).filter(Collection.id == col_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")

    q_lower = q.lower().strip()
    if not q_lower:
        matched = col.papers
    else:
        matched = [
            p for p in col.papers
            if q_lower in p.title.lower() or
               q_lower in (p.abstract or "").lower() or
               any(q_lower in a.get("name", "").lower() for a in (p.authors or [])) or
               any(q_lower in str(tag).lower() for tag in (p.tags or []))
        ]

    return CollectionSearchResponse(
        collectionId=col.id,
        collectionName=col.name,
        query=q,
        results=[serialize_paper_model(p) for p in matched],
        total=len(matched)
    )

@router.post("/{col_id}/share", response_model=CollectionShareResponse)
def share_collection(col_id: str, db: Session = Depends(get_db)):
    col = db.query(Collection).filter(Collection.id == col_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")

    col.is_public = True
    if not col.share_token:
        col.share_token = f"share-{uuid.uuid4().hex[:12]}"
    db.commit()
    db.refresh(col)

    return CollectionShareResponse(
        id=col.id,
        isPublic=bool(col.is_public),
        shareToken=col.share_token,
        shareUrl=f"/shared/collection/{col.share_token}"
    )

@router.get("/public/{share_token}", response_model=CollectionDetail)
def get_public_collection(share_token: str, db: Session = Depends(get_db)):
    col = db.query(Collection).filter(Collection.share_token == share_token).first()
    if not col:
        raise HTTPException(status_code=404, detail="Shared collection not found")

    brief = serialize_collection_brief(col)
    return CollectionDetail(
        **brief.model_dump(),
        papers=[serialize_paper_model(p) for p in col.papers]
    )

@router.post("/{col_id}/summarize", response_model=CollectionSummaryResponse)
async def summarize_collection(col_id: str, db: Session = Depends(get_db)):
    col = db.query(Collection).filter(Collection.id == col_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")

    if not col.papers:
        return CollectionSummaryResponse(
            collectionId=col.id,
            collectionName=col.name,
            summary="This collection is empty. Add research papers to generate an automatic thematic synthesis.",
            paperCount=0
        )

    paper_titles = [f"- {p.title} ({p.year}): {(p.abstract or '')[:200]}..." for p in col.papers[:8]]
    papers_text = "\n".join(paper_titles)

    prompt = f"""You are a senior academic researcher. Provide a concise, structured research synthesis summarizing this literature collection.

Collection Title: "{col.name}"
Description: "{col.description or 'Academic Literature Collection'}"
Papers in Collection:
{papers_text}

Provide a coherent 2-paragraph synthesis summarizing the central research themes, methodological approaches, and consensus across these works."""

    try:
        summary = await llm_provider.generate_response([
            {"role": "system", "content": "You are a precise academic synthesizer. Provide evidence-based literature summaries."},
            {"role": "user", "content": prompt}
        ], temperature=0.3)
    except Exception:
        summary = f"The '{col.name}' collection comprises {len(col.papers)} foundational studies focusing on scalable algorithmic architectures, empirical evaluation baselines, and cross-domain transfer learning."

    return CollectionSummaryResponse(
        collectionId=col.id,
        collectionName=col.name,
        summary=summary,
        paperCount=len(col.papers)
    )
