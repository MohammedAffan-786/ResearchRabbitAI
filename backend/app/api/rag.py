from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.db.models import Paper, LiteratureReview, ResearchSession, ChatMessage, UserActivity
from backend.app.services.rag_pipeline import rag_pipeline
from backend.app.core.security import get_optional_current_user_id

router = APIRouter(prefix="/ai", tags=["AI Research Assistant"])

class AskQuestionRequest(BaseModel):
    question: str
    paperIds: List[str]
    mode: Optional[str] = "comprehensive"
    session_id: Optional[str] = None

class SynthesizeReviewRequest(BaseModel):
    topic: str
    paperIds: List[str]
    collectionName: Optional[str] = None

@router.post("/ask")
async def ask_question(
    req: AskQuestionRequest,
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    if not req.question:
        raise HTTPException(status_code=400, detail="Question is required")

    target_papers = db.query(Paper).filter(Paper.id.in_(req.paperIds)).all()
    if not target_papers:
        # Fallback to papers if none matched
        target_papers = db.query(Paper).limit(4).all()

    # Find or initialize ResearchSession
    session = None
    if req.session_id:
        session = db.query(ResearchSession).filter(ResearchSession.id == req.session_id).first()
    
    if not session:
        session = ResearchSession(
            user_id=user_id,
            title=req.question[:80].strip(),
            mode=req.mode or "comprehensive",
            paper_ids=req.paperIds or [p.id for p in target_papers]
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # Persist user question ChatMessage
    user_msg = ChatMessage(
        session_id=session.id,
        role="user",
        content=req.question,
        token_count=len(req.question.split())
    )
    db.add(user_msg)
    db.commit()

    result = await rag_pipeline.answer_question(
        question=req.question,
        target_papers=target_papers,
        mode=req.mode or "comprehensive"
    )

    # Persist assistant response ChatMessage with citations payload
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=result.get("answer", ""),
        citations_payload=result.get("citations", []),
        token_count=len(result.get("answer", "").split())
    )
    db.add(assistant_msg)

    # Log user activity if authenticated
    if user_id:
        activity = UserActivity(
            user_id=user_id,
            activity_type="ai_chat",
            entity_type="research_session",
            entity_id=session.id,
            title=f"Asked: {req.question[:60]}",
            metadata_json={"mode": req.mode, "paperCount": len(target_papers)}
        )
        db.add(activity)

    db.commit()

    # Attach sessionId to response
    result["sessionId"] = session.id
    return result

@router.get("/sessions")
def list_sessions(
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    query = db.query(ResearchSession)
    if user_id:
        query = query.filter(ResearchSession.user_id == user_id)
    sessions = query.order_by(ResearchSession.updated_at.desc()).all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "mode": s.mode,
            "paperIds": s.paper_ids,
            "createdAt": s.created_at.isoformat(),
            "updatedAt": s.updated_at.isoformat(),
            "messageCount": len(s.messages)
        }
        for s in sessions
    ]

@router.get("/sessions/{session_id}/messages")
def get_session_messages(
    session_id: str,
    db: Session = Depends(get_db)
):
    session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Research session not found")
    
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    return {
        "session": {
            "id": session.id,
            "title": session.title,
            "mode": session.mode,
            "paperIds": session.paper_ids,
            "createdAt": session.created_at.isoformat()
        },
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "citations": m.citations_payload,
                "createdAt": m.created_at.isoformat()
            }
            for m in messages
        ]
    }

@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Research session not found")
    db.delete(session)
    db.commit()
    return {"success": True}

@router.post("/synthesize")
async def synthesize_review(
    req: SynthesizeReviewRequest,
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    if not req.topic or not req.paperIds:
        raise HTTPException(status_code=400, detail="Topic and at least 1 paperId are required")

    target_papers = db.query(Paper).filter(Paper.id.in_(req.paperIds)).all()
    if not target_papers:
        raise HTTPException(status_code=404, detail="Selected papers not found")

    review_data = await rag_pipeline.generate_systematic_review(
        topic=req.topic,
        target_papers=target_papers
    )

    new_review = LiteratureReview(
        user_id=user_id,
        title=review_data["title"],
        topic=review_data["topic"],
        paper_ids=review_data["paperIds"],
        executive_summary=review_data["executiveSummary"],
        sections=review_data["sections"],
        synthesis_matrix=review_data["synthesisMatrix"],
        prisma_stats=review_data.get("prismaStats")
    )
    db.add(new_review)

    if user_id:
        activity = UserActivity(
            user_id=user_id,
            activity_type="synthesize_review",
            entity_type="literature_review",
            entity_id=new_review.id,
            title=f"Review: {new_review.title[:60]}",
            metadata_json={"topic": new_review.topic, "paperCount": len(target_papers)}
        )
        db.add(activity)

    db.commit()
    db.refresh(new_review)

    return {
        "id": new_review.id,
        "title": new_review.title,
        "topic": new_review.topic,
        "paperIds": new_review.paper_ids,
        "executiveSummary": new_review.executive_summary,
        "sections": new_review.sections,
        "synthesisMatrix": new_review.synthesis_matrix,
        "prismaStats": new_review.prisma_stats,
        "createdAt": new_review.created_at.isoformat(),
        "updatedAt": new_review.updated_at.isoformat()
    }

@router.get("/reviews")
def list_reviews(db: Session = Depends(get_db)):
    reviews = db.query(LiteratureReview).all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "topic": r.topic,
            "paperIds": r.paper_ids,
            "executiveSummary": r.executive_summary,
            "sections": r.sections,
            "synthesisMatrix": r.synthesis_matrix,
            "prismaStats": r.prisma_stats,
            "createdAt": r.created_at.isoformat(),
            "updatedAt": r.updated_at.isoformat()
        }
        for r in reviews
    ]

@router.delete("/reviews/{review_id}")
def delete_review(review_id: str, db: Session = Depends(get_db)):
    rev = db.query(LiteratureReview).filter(LiteratureReview.id == review_id).first()
    if not rev:
        raise HTTPException(status_code=404, detail="Review not found")
    db.delete(rev)
    db.commit()
    return {"success": True}
