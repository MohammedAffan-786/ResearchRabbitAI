from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.dependencies import get_db, get_optional_current_user_id, rate_limit_global
from backend.app.models import PrismaProject, Paper, LiteratureReview
from backend.app.schemas.literature_review import (
    PrismaProjectCreate,
    PrismaScreenRequest,
    PrismaProjectResponse,
    SynthesizeReviewRequest,
    LiteratureReviewResponse
)
from backend.app.services.literature_review.review_service import review_service
from backend.app.services.rag.rag_service import rag_service

router = APIRouter(tags=["Literature Reviews & PRISMA"], dependencies=[Depends(rate_limit_global)])

def serialize_prisma_project(p: PrismaProject) -> PrismaProjectResponse:
    flow = review_service.calculate_prisma_flow(p)
    return PrismaProjectResponse(
        id=p.id,
        title=p.title,
        researchQuestion=p.research_question,
        identifiedCount=flow["identification"]["recordsIdentified"],
        screenedCount=flow["screening"]["recordsScreened"],
        eligibleCount=flow["eligibility"]["reportsAssessed"],
        includedCount=flow["included"]["studiesIncluded"],
        excludedCount=flow["screening"]["recordsExcluded"],
        flowchartData=flow,
        createdAt=p.created_at.isoformat() if p.created_at else datetime.utcnow().isoformat()
    )

@router.get("/prisma")
def list_prisma_projects(db: Session = Depends(get_db)):
    projects = db.query(PrismaProject).all()
    if not projects:
        default_proj = PrismaProject(
            title="Systematic Review Screening Workbench",
            research_question="How do scalable attention and state-space architectures compare in sample efficiency and reasoning?",
            inclusion_criteria=["Peer-reviewed or verified preprint", "Empirical benchmark evaluation", "Relevant to research question"],
            exclusion_criteria=["Missing empirical validation", "Duplicate or superseded study", "Non-English publication"],
            records=[]
        )
        db.add(default_proj)
        db.commit()
        db.refresh(default_proj)
        projects = [default_proj]

    return [
        {
            "id": p.id,
            "title": p.title,
            "researchQuestion": p.research_question,
            "inclusionCriteria": p.inclusion_criteria or [],
            "exclusionCriteria": p.exclusion_criteria or [],
            "records": p.records or [],
            "flowchart": review_service.calculate_prisma_flow(p),
            "createdAt": p.created_at.isoformat() if p.created_at else None,
            "updatedAt": p.updated_at.isoformat() if p.updated_at else None
        }
        for p in projects
    ]

@router.post("/prisma", status_code=201)
def create_prisma_project(
    req: PrismaProjectCreate,
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    project = PrismaProject(
        user_id=user_id,
        title=req.title,
        research_question=req.researchQuestion,
        inclusion_criteria=["Peer-reviewed", "Quantitative Evaluation"],
        exclusion_criteria=["Incomplete metrics", "Superseded study"],
        records=[]
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    return {
        "id": project.id,
        "title": project.title,
        "researchQuestion": project.research_question,
        "inclusionCriteria": project.inclusion_criteria,
        "exclusionCriteria": project.exclusion_criteria,
        "records": project.records,
        "flowchart": review_service.calculate_prisma_flow(project),
        "createdAt": project.created_at.isoformat()
    }

@router.post("/prisma/{project_id}/screen")
def screen_paper(
    project_id: str,
    req: PrismaScreenRequest,
    db: Session = Depends(get_db)
):
    project = db.query(PrismaProject).filter(PrismaProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="PRISMA project not found")

    paper = db.query(Paper).filter(Paper.id == req.paperId).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    current_records = list(project.records or [])
    updated = False
    for rec in current_records:
        if rec.get("paperId") == req.paperId:
            rec["stage"] = req.stage
            rec["exclusionReason"] = req.exclusionReason
            rec["timestamp"] = datetime.utcnow().isoformat()
            updated = True
            break

    if not updated:
        current_records.append({
            "paperId": paper.id,
            "title": paper.title,
            "year": paper.year,
            "stage": req.stage,
            "exclusionReason": req.exclusionReason,
            "timestamp": datetime.utcnow().isoformat()
        })

    project.records = current_records
    db.commit()
    db.refresh(project)

    return {
        "id": project.id,
        "title": project.title,
        "researchQuestion": project.research_question,
        "records": project.records,
        "flowchart": review_service.calculate_prisma_flow(project)
    }

@router.get("/literature-reviews", response_model=List[LiteratureReviewResponse])
def list_literature_reviews(db: Session = Depends(get_db)):
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
