from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.db.models import PrismaProject, Paper
from backend.app.core.security import get_optional_current_user_id

router = APIRouter(prefix="/prisma", tags=["PRISMA Systematic Review"])

class PrismaCreate(BaseModel):
    title: str
    researchQuestion: str
    inclusionCriteria: Optional[List[str]] = None
    exclusionCriteria: Optional[List[str]] = None

class ScreenPaperRequest(BaseModel):
    paperId: str
    stage: str
    exclusionReason: Optional[str] = None

@router.get("")
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
            "createdAt": p.created_at.isoformat() if p.created_at else None,
            "updatedAt": p.updated_at.isoformat() if p.updated_at else None
        }
        for p in projects
    ]

@router.post("", status_code=201)
def create_prisma_project(
    req: PrismaCreate,
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    project = PrismaProject(
        user_id=user_id,
        title=req.title,
        research_question=req.researchQuestion,
        inclusion_criteria=req.inclusionCriteria or ["Peer-reviewed or verified preprint", "Empirical benchmark evaluation"],
        exclusion_criteria=req.exclusionCriteria or ["Missing empirical validation", "Duplicate study"],
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
        "createdAt": project.created_at.isoformat()
    }

@router.post("/{project_id}/screen")
def screen_paper(project_id: str, req: ScreenPaperRequest, db: Session = Depends(get_db)):
    project = db.query(PrismaProject).filter(PrismaProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="PRISMA Project not found")

    paper = db.query(Paper).filter(Paper.id == req.paperId).first()
    current_records = [r for r in (project.records or []) if r.get("paperId") != req.paperId]

    new_record = {
        "paperId": req.paperId,
        "paperTitle": paper.title if paper else "Unknown Paper",
        "stage": req.stage,
        "exclusionReason": req.exclusionReason,
        "timestamp": datetime.utcnow().isoformat()
    }
    current_records.append(new_record)
    project.records = current_records
    db.commit()
    db.refresh(project)

    return {
        "id": project.id,
        "records": project.records
    }
