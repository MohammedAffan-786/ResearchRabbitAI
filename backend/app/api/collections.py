import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.db.database import get_db
from backend.app.db.models import Collection, Paper, ResearchActivity, CollectionPaper
from backend.app.core.security import get_optional_current_user_id
from backend.app.services.llm_provider import get_llm_provider

router = APIRouter(prefix="/collections", tags=["Collections"])
llm_provider = get_llm_provider()

class CollectionCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    color: Optional[str] = "#3b82f6"
    icon: Optional[str] = "Folder"
    tags: Optional[List[str]] = None

class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None

class AddPaperRequest(BaseModel):
    paperId: str

class PaperAnnotationUpdate(BaseModel):
    notes: Optional[str] = None
    rating: Optional[int] = None

def serialize_paper_brief(p: Paper):
    return {
        "id": p.id,
        "title": p.title,
        "authors": p.authors or [],
        "abstract": p.abstract or "",
        "year": p.year,
        "venue": p.venue,
        "citationCount": p.citation_count,
        "fieldsOfStudy": p.fields_of_study or [],
        "openAccessPdfUrl": p.open_access_pdf_url,
        "readingStatus": p.reading_status,
        "tags": p.tags or []
    }

def serialize_collection(c: Collection):
    return {
        "id": c.id,
        "name": c.name,
        "description": c.description,
        "color": c.color,
        "icon": c.icon,
        "isPublic": bool(c.is_public),
        "shareToken": c.share_token,
        "tags": c.tags or [],
        "paperCount": len(c.papers),
        "paperIds": [p.id for p in c.papers],
        "createdAt": c.created_at.isoformat() if c.created_at else None,
        "updatedAt": c.updated_at.isoformat() if c.updated_at else None
    }

@router.get("")
def list_collections(
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    query = db.query(Collection)
    if user_id:
        query = query.filter((Collection.owner_id == user_id) | (Collection.owner_id.is_(None)))
    collections = query.order_by(desc(Collection.updated_at)).all()
    return [serialize_collection(c) for c in collections]

@router.post("", status_code=201)
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

    # Log activity
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

    return serialize_collection(col)

@router.get("/{col_id}")
def get_collection(col_id: str, db: Session = Depends(get_db)):
    col = db.query(Collection).filter(Collection.id == col_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")

    res = serialize_collection(col)
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
        p_dict = serialize_paper_brief(p)
        meta = cp_map.get(p.id, {})
        p_dict["notes"] = meta.get("notes")
        p_dict["userRating"] = meta.get("userRating")
        p_dict["addedAt"] = meta.get("addedAt")
        paper_list.append(p_dict)
    res["papers"] = paper_list
    return res

@router.patch("/{col_id}/papers/{paper_id}/annotation")
def update_paper_annotation(
    col_id: str,
    paper_id: str,
    payload: PaperAnnotationUpdate,
    db: Session = Depends(get_db)
):
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

@router.patch("/{col_id}")
def update_collection(col_id: str, updates: CollectionUpdate, db: Session = Depends(get_db)):
    col = db.query(Collection).filter(Collection.id == col_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")

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
    return serialize_collection(col)

@router.delete("/{col_id}")
def delete_collection(col_id: str, db: Session = Depends(get_db)):
    col = db.query(Collection).filter(Collection.id == col_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    db.delete(col)
    db.commit()
    return {"success": True}

@router.post("/{col_id}/papers")
def add_paper_to_collection(col_id: str, req: AddPaperRequest, db: Session = Depends(get_db)):
    col = db.query(Collection).filter(Collection.id == col_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")

    paper = db.query(Paper).filter(Paper.id == req.paperId).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    if paper not in col.papers:
        col.papers.append(paper)
        db.commit()
        db.refresh(col)

    return serialize_collection(col)

@router.delete("/{col_id}/papers/{paper_id}")
def remove_paper_from_collection(col_id: str, paper_id: str, db: Session = Depends(get_db)):
    col = db.query(Collection).filter(Collection.id == col_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")

    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if paper and paper in col.papers:
        col.papers.remove(paper)
        db.commit()
        db.refresh(col)

    return serialize_collection(col)

@router.get("/{col_id}/search")
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

    return {
        "collectionId": col.id,
        "collectionName": col.name,
        "query": q,
        "results": [serialize_paper_brief(p) for p in matched],
        "total": len(matched)
    }

@router.post("/{col_id}/share")
def toggle_collection_share(col_id: str, db: Session = Depends(get_db)):
    col = db.query(Collection).filter(Collection.id == col_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")

    if not col.share_token:
        col.share_token = f"share-{uuid.uuid4().hex[:12]}"

    # Toggle
    col.is_public = not col.is_public
    db.commit()
    db.refresh(col)

    return {
        "id": col.id,
        "isPublic": bool(col.is_public),
        "shareToken": col.share_token,
        "shareUrl": f"/collection/public/{col.share_token}" if col.is_public else None
    }

@router.get("/public/{share_token}")
def get_public_collection(share_token: str, db: Session = Depends(get_db)):
    col = db.query(Collection).filter(Collection.share_token == share_token).first()
    if not col or not col.is_public:
        raise HTTPException(status_code=404, detail="Public collection not found or private")

    return {
        "id": col.id,
        "name": col.name,
        "description": col.description,
        "color": col.color,
        "icon": col.icon,
        "isPublic": True,
        "shareToken": col.share_token,
        "paperCount": len(col.papers),
        "papers": [serialize_paper_brief(p) for p in col.papers],
        "tags": col.tags or []
    }

@router.post("/{col_id}/summarize")
async def summarize_collection(col_id: str, db: Session = Depends(get_db)):
    col = db.query(Collection).filter(Collection.id == col_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")

    if not col.papers:
        return {"summary": "This collection is currently empty. Add research papers to generate an evidence synthesis."}

    paper_titles = "\n".join([f"- {p.title} ({p.year}): {(p.abstract or '')[:200]}..." for p in col.papers[:10]])
    prompt = f"""You are a senior scientific research synthesizer. Provide a concise, high-level executive summary of this research collection:
Collection: "{col.name}" - {col.description or ''}
Papers in collection:
{paper_titles}

Provide:
1. Core thematic focus across these papers.
2. Predominant methodologies employed.
3. Collective significance to the field."""

    try:
        summary_text = await llm_provider.generate_response([
            {"role": "system", "content": "You are an expert scientific synthesizer."},
            {"role": "user", "content": prompt}
        ], temperature=0.3)
    except Exception:
        summary_text = f"This collection aggregates {len(col.papers)} key works on '{col.name}', covering foundational formulations, algorithmic implementations, and empirical benchmarks in modern scholarly literature."

    return {
        "collectionId": col.id,
        "collectionName": col.name,
        "paperCount": len(col.papers),
        "summary": summary_text
    }
