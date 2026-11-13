import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.app.core.dependencies import get_db, get_optional_current_user_id, rate_limit_global
from backend.app.models import Paper, LiteratureReview, ResearchSession, ChatMessage, UserActivity
from backend.app.services.rag.rag_service import rag_service
from backend.app.services.llm_provider import list_llm_providers
from backend.app.services.embedding_provider import list_embedding_providers
from backend.app.schemas.assistant import AskQuestionRequest, AskQuestionResponse, ResearchSessionBrief, ResearchSessionDetail, SessionMessageItem
from backend.app.schemas.literature_review import SynthesizeReviewRequest, LiteratureReviewResponse

router = APIRouter(tags=["AI Research Assistant"], dependencies=[Depends(rate_limit_global)])

@router.get("/ai/providers")
@router.get("/assistant/providers")
def get_ai_providers():
    """Returns supported LLM and embedding providers with configuration status."""
    return {
        "llmProviders": list_llm_providers(),
        "embeddingProviders": list_embedding_providers(),
    }

@router.post("/ai/ask", response_model=AskQuestionResponse)
@router.post("/assistant/ask", response_model=AskQuestionResponse)
async def ask_question(
    req: AskQuestionRequest,
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    if not req.question:
        raise HTTPException(status_code=400, detail="Question is required")

    target_papers = db.query(Paper).filter(Paper.id.in_(req.paperIds)).all()
    if not target_papers:
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

    result = await rag_service.answer_question(
        question=req.question,
        target_papers=target_papers,
        mode=req.mode or "comprehensive",
        model_provider=req.modelProvider,
        user_api_key=req.userApiKey
    )

    # Persist assistant response ChatMessage
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=result.get("answer", ""),
        citations_payload=result.get("citations", []),
        token_count=len(result.get("answer", "").split())
    )
    db.add(assistant_msg)

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

    return AskQuestionResponse(
        answer=result.get("answer", ""),
        citations=result.get("citations", []),
        confidenceScore=result.get("confidenceScore", 0.95),
        mode=result.get("mode", req.mode or "comprehensive"),
        hasFullTextCoverage=result.get("hasFullTextCoverage", True),
        sessionId=session.id
    )

@router.post("/ai/ask/stream")
@router.post("/assistant/ask/stream")
async def ask_question_stream(
    req: AskQuestionRequest,
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Low-latency token streaming for interactive Qwen3:4b responses via Ollama.
    """
    if not req.question:
        raise HTTPException(status_code=400, detail="Question is required")

    target_papers = db.query(Paper).filter(Paper.id.in_(req.paperIds)).all()
    if not target_papers:
        target_papers = db.query(Paper).limit(4).all()

    async def token_generator():
        async for token in rag_service.stream_answer_question(
            question=req.question,
            target_papers=target_papers,
            mode=req.mode or "comprehensive",
            model_provider=req.modelProvider,
            user_api_key=req.userApiKey
        ):
            yield f"data: {json.dumps({'token': token})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(token_generator(), media_type="text/event-stream")

@router.get("/ai/sessions", response_model=List[ResearchSessionBrief])
@router.get("/assistant/sessions", response_model=List[ResearchSessionBrief])
def list_sessions(
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    query = db.query(ResearchSession)
    if user_id:
        query = query.filter(ResearchSession.user_id == user_id)
    sessions = query.order_by(ResearchSession.updated_at.desc()).all()
    return [
        ResearchSessionBrief(
            id=s.id,
            title=s.title,
            mode=s.mode,
            paperIds=s.paper_ids or [],
            createdAt=s.created_at.isoformat(),
            updatedAt=s.updated_at.isoformat() if s.updated_at else None,
            messageCount=len(s.messages)
        )
        for s in sessions
    ]

@router.get("/ai/sessions/{session_id}/messages", response_model=ResearchSessionDetail)
@router.get("/assistant/sessions/{session_id}/messages", response_model=ResearchSessionDetail)
def get_session_messages(
    session_id: str,
    db: Session = Depends(get_db)
):
    session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Research session not found")

    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    return ResearchSessionDetail(
        session={
            "id": session.id,
            "title": session.title,
            "mode": session.mode,
            "paperIds": session.paper_ids or [],
            "createdAt": session.created_at.isoformat()
        },
        messages=[
            SessionMessageItem(
                id=m.id,
                role=m.role,
                content=m.content,
                citations=m.citations_payload or [],
                createdAt=m.created_at.isoformat()
            )
            for m in messages
        ]
    )

@router.delete("/ai/sessions/{session_id}")
@router.delete("/assistant/sessions/{session_id}")
def delete_session(
    session_id: str,
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Research session not found")
    if session.user_id and user_id and session.user_id != user_id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this research session.")
    db.delete(session)
    db.commit()
    return {"success": True}

@router.post("/ai/synthesize", response_model=LiteratureReviewResponse)
@router.post("/literature-reviews/synthesize", response_model=LiteratureReviewResponse)
@router.post("/literature-reviews", response_model=LiteratureReviewResponse)
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

    review_data = await rag_service.generate_systematic_review(
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

    return LiteratureReviewResponse(
        id=new_review.id,
        title=new_review.title,
        topic=new_review.topic,
        paperIds=new_review.paper_ids or [],
        executiveSummary=new_review.executive_summary,
        sections=new_review.sections or [],
        synthesisMatrix=new_review.synthesis_matrix or [],
        prismaStats=new_review.prisma_stats,
        createdAt=new_review.created_at.isoformat(),
        updatedAt=new_review.updated_at.isoformat() if new_review.updated_at else None
    )

@router.get("/ai/reviews", response_model=List[LiteratureReviewResponse])
def list_reviews(db: Session = Depends(get_db)):
    reviews = db.query(LiteratureReview).all()
    return [
        LiteratureReviewResponse(
            id=r.id,
            title=r.title,
            topic=r.topic,
            paperIds=r.paper_ids or [],
            executiveSummary=r.executive_summary,
            sections=r.sections or [],
            synthesisMatrix=r.synthesis_matrix or [],
            prismaStats=r.prisma_stats,
            createdAt=r.created_at.isoformat(),
            updatedAt=r.updated_at.isoformat() if r.updated_at else None
        )
        for r in reviews
    ]

@router.delete("/ai/reviews/{review_id}")
def delete_review(
    review_id: str,
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    rev = db.query(LiteratureReview).filter(LiteratureReview.id == review_id).first()
    if not rev:
        raise HTTPException(status_code=404, detail="Review not found")
    if rev.user_id and user_id and rev.user_id != user_id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this literature review.")
    db.delete(rev)
    db.commit()
    return {"success": True}
