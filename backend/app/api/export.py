from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.db.models import Paper, Collection, LiteratureReview, ResearchActivity
from backend.app.core.security import get_optional_current_user_id

router = APIRouter(prefix="/export", tags=["Export"])

class ExportRequest(BaseModel):
    paperIds: Optional[List[str]] = None
    format: str = "bibtex"  # bibtex, ris, text
    style: Optional[str] = "apa"  # apa, mla, ieee, chicago, harvard

class ReviewExportRequest(BaseModel):
    reviewId: str
    format: str = "markdown"  # markdown, csv

def to_bibtex(papers: List[Paper]) -> str:
    entries = []
    for p in papers:
        first_author = (p.authors[0].get("name", "Author") if p.authors else "Author").split()[-1].lower()
        first_word = p.title.split()[0].lower() if p.title else "paper"
        cite_key = f"{first_author}{p.year}{first_word}"
        authors_str = " and ".join(a.get("name", "") for a in (p.authors or []))

        venue_line = f"  journal={{{p.venue}}},\n" if p.venue else ""
        doi_line = f"  doi={{{p.doi}}},\n" if p.doi else ""
        arxiv_line = f"  eprint={{{p.arxiv_id}}},\n  archivePrefix={{arXiv}},\n" if p.arxiv_id else ""

        entry = (
            f"@article{{{cite_key},\n"
            f"  title={{{p.title}}},\n"
            f"  author={{{authors_str}}},\n"
            f"{venue_line}{doi_line}{arxiv_line}"
            f"  year={{{p.year}}}\n"
            f"}}"
        )
        entries.append(entry)
    return "\n\n".join(entries)

def to_ris(papers: List[Paper]) -> str:
    lines = []
    for p in papers:
        lines.append("TY  - JOUR")
        lines.append(f"TI  - {p.title}")
        for a in (p.authors or []):
            lines.append(f"AU  - {a.get('name', '')}")
        lines.append(f"PY  - {p.year}")
        if p.venue:
            lines.append(f"JO  - {p.venue}")
        if p.doi:
            lines.append(f"DO  - {p.doi}")
        if p.abstract:
            lines.append(f"AB  - {' '.join(p.abstract.split())}")
        if p.open_access_pdf_url:
            lines.append(f"UR  - {p.open_access_pdf_url}")
        lines.append("ER  - \n")
    return "\n".join(lines)

def format_citation(paper: Paper, style: str = "apa") -> str:
    names = [a.get("name", "") for a in (paper.authors or []) if a.get("name")]
    author_str = ""
    if len(names) == 1:
        author_str = f"{names[0]}."
    elif len(names) == 2:
        author_str = f"{names[0]}, & {names[1]}."
    elif len(names) > 2:
        author_str = f"{names[0]} et al."
    else:
        author_str = "Anonymous Researcher."

    if style == "apa":
        venue_str = f" *{paper.venue}*." if paper.venue else ""
        doi_str = f" https://doi.org/{paper.doi}" if paper.doi else ""
        return f"{author_str} ({paper.year}). {paper.title}.{venue_str}{doi_str}".strip()

    if style == "mla":
        return f'{author_str} "{paper.title}." *{paper.venue or "Academic Press"}*, {paper.year}.'

    if style == "ieee":
        return f'{author_str}, "{paper.title}," in *{paper.venue or "Proceedings"}*, {paper.year}.'

    if style == "chicago":
        return f'{author_str} "{paper.title}." *{paper.venue or "Scholarly Publication"}* ({paper.year}).'

    if style == "harvard":
        return f"{author_str} ({paper.year}) '{paper.title}', *{paper.venue or 'Academic Journal'}*."

    return f"{author_str} ({paper.year}) '{paper.title}', *{paper.venue or 'Journal'}*."

@router.post("")
def export_citations(
    req: ExportRequest,
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    if req.paperIds and len(req.paperIds) > 0:
        papers = db.query(Paper).filter(Paper.id.in_(req.paperIds)).all()
    else:
        papers = db.query(Paper).all()

    # Log export activity
    act = ResearchActivity(
        user_id=user_id,
        activity_type="export_citations",
        title=f"Exported {len(papers)} references as {req.format.upper()}",
        metadata_json={"format": req.format, "style": req.style, "count": len(papers)}
    )
    db.add(act)
    try:
        db.commit()
    except Exception:
        db.rollback()

    if req.format == "bibtex":
        bib = to_bibtex(papers)
        return Response(content=bib, media_type="text/plain", headers={"Content-Disposition": 'attachment; filename="references.bib"'})

    if req.format == "ris":
        ris = to_ris(papers)
        return Response(content=ris, media_type="text/plain", headers={"Content-Disposition": 'attachment; filename="references.ris"'})

    # Formatted Text
    citations = [format_citation(p, req.style or "apa") for p in papers]
    return {"citations": citations, "count": len(citations), "style": req.style or "apa"}

@router.post("/collection/{col_id}")
def export_collection(
    col_id: str,
    format: str = "bibtex",
    style: str = "apa",
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    col = db.query(Collection).filter(Collection.id == col_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")

    papers = col.papers
    clean_col_name = col.name.replace(" ", "_")

    if format == "bibtex":
        bib = to_bibtex(papers)
        return Response(content=bib, media_type="text/plain", headers={"Content-Disposition": f'attachment; filename="{clean_col_name}.bib"'})

    if format == "ris":
        ris = to_ris(papers)
        return Response(content=ris, media_type="text/plain", headers={"Content-Disposition": f'attachment; filename="{clean_col_name}.ris"'})

    citations = [format_citation(p, style) for p in papers]
    return {"citations": citations, "count": len(citations), "collectionName": col.name}

@router.post("/review")
def export_review(req: ReviewExportRequest, db: Session = Depends(get_db)):
    review = db.query(LiteratureReview).filter(LiteratureReview.id == req.reviewId).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    if req.format == "csv":
        headers = ["Paper Title", "Authors", "Year", "Objective", "Methodology", "Key Findings", "Limitations"]
        rows = []
        for r in (review.synthesis_matrix or []):
            title = str(r.get("paperTitle", "")).replace('"', '""')
            authors = str(r.get("authors", "")).replace('"', '""')
            yr = r.get("year", 2024)
            obj = str(r.get("objective", "")).replace('"', '""')
            meth = str(r.get("methodology", "")).replace('"', '""')
            findings = str(r.get("keyFindings", "")).replace('"', '""')
            limits = str(r.get("limitations", "")).replace('"', '""')
            rows.append(f'"{title}","{authors}",{yr},"{obj}","{meth}","{findings}","{limits}"')
        csv_content = ",".join(headers) + "\n" + "\n".join(rows)
        clean_name = review.title.replace(" ", "_")
        return Response(content=csv_content, media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{clean_name}.csv"'})

    # Default Markdown
    clean_name = review.title.replace(" ", "_")
    md = f"# {review.title}\n\n**Topic:** {review.topic}\n**Date:** {review.created_at.strftime('%Y-%m-%d') if review.created_at else ''}\n\n"
    md += f"## Executive Summary\n\n{review.executive_summary}\n\n"
    for sec in (review.sections or []):
        md += f"## {sec.get('heading')}\n\n{sec.get('content')}\n\n"

    md += "## Evidence Extraction Matrix\n\n| Paper | Year | Objective | Methodology | Key Findings | Limitations |\n| :--- | :---: | :--- | :--- | :--- | :--- |\n"
    for row in (review.synthesis_matrix or []):
        md += f"| {row.get('paperTitle')} | {row.get('year')} | {row.get('objective')} | {row.get('methodology')} | {row.get('keyFindings')} | {row.get('limitations')} |\n"

    return Response(content=md, media_type="text/markdown", headers={"Content-Disposition": f'attachment; filename="{clean_name}.md"'})
