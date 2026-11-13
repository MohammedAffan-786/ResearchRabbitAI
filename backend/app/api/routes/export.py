from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.core.dependencies import get_db, get_optional_current_user_id, rate_limit_global
from backend.app.models import Paper, Collection, LiteratureReview, ResearchActivity

router = APIRouter(prefix="/export", tags=["Export"], dependencies=[Depends(rate_limit_global)])

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

def to_citation_style(p: Paper, style: str) -> str:
    authors = [a.get("name", "") for a in (p.authors or [])]
    author_str = ", ".join(authors) if authors else "Author"
    year = p.year or 2024
    title = p.title
    venue = p.venue or "Journal of Academic Research"
    doi_str = f" https://doi.org/{p.doi}" if p.doi else ""

    if style.lower() == "apa":
        first_author = authors[0].split()[-1] + ", " + authors[0][0] + "." if authors else "Author, A."
        return f"{first_author} ({year}). {title}. {venue}.{doi_str}"
    elif style.lower() == "mla":
        first_author = authors[0].split()[-1] + ", " + " ".join(authors[0].split()[:-1]) if authors else "Author"
        return f"{first_author}. \"{title}.\" {venue}, {year}.{doi_str}"
    elif style.lower() == "ieee":
        initials = authors[0][0] + ". " + authors[0].split()[-1] if authors else "A. Author"
        return f"{initials}, \"{title},\" {venue}, {year}.{doi_str}"
    elif style.lower() == "chicago":
        return f"{author_str}. \"{title}.\" {venue} ({year}).{doi_str}"
    elif style.lower() == "harvard":
        return f"{author_str}, {year}. {title}. {venue}.{doi_str}"
    else:
        return f"{author_str} ({year}). {title}. {venue}.{doi_str}"

@router.post("")
def export_citations(
    req: ExportRequest,
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    if not req.paperIds:
        papers = db.query(Paper).limit(10).all()
    else:
        papers = db.query(Paper).filter(Paper.id.in_(req.paperIds)).all()

    if not papers:
        raise HTTPException(status_code=404, detail="No papers found to export")

    if user_id:
        act = ResearchActivity(
            user_id=user_id,
            activity_type="export_citations",
            title=f"Exported {len(papers)} references in {req.format.upper()} format",
            metadata_json={"format": req.format, "style": req.style, "paperCount": len(papers)}
        )
        db.add(act)
        try:
            db.commit()
        except Exception:
            db.rollback()

    fmt = req.format.lower()
    if fmt == "bibtex":
        content = to_bibtex(papers)
        return Response(content=content, media_type="application/x-bibtex")
    elif fmt == "ris":
        content = to_ris(papers)
        return Response(content=content, media_type="application/x-research-info-systems")
    else:
        style = req.style or "apa"
        citations = [to_citation_style(p, style) for p in papers]
        return {
            "format": "text",
            "style": style,
            "citations": citations,
            "text": "\n\n".join(citations)
        }

@router.post("/review")
def export_review(req: ReviewExportRequest, db: Session = Depends(get_db)):
    rev = db.query(LiteratureReview).filter(LiteratureReview.id == req.reviewId).first()
    if not rev:
        raise HTTPException(status_code=404, detail="Review not found")

    fmt = req.format.lower()
    if fmt == "csv":
        import csv
        import io
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Paper ID", "Study", "Methodology", "Sample/Dataset", "Key Findings", "Limitations"])
        for row in (rev.synthesis_matrix or []):
            writer.writerow([
                row.get("paperId", ""),
                row.get("study", ""),
                row.get("methodology", ""),
                row.get("sampleDataset", ""),
                row.get("findings", ""),
                row.get("limitations", "")
            ])
        return Response(content=output.getvalue(), media_type="text/csv")
    else:
        lines = [
            f"# {rev.title}",
            f"**Research Topic:** {rev.topic}",
            f"**Synthesized Date:** {rev.created_at.strftime('%B %d, %Y') if rev.created_at else 'Recent'}",
            "",
            "## Executive Summary",
            rev.executive_summary,
            ""
        ]
        for sec in (rev.sections or []):
            lines.append(f"## {sec.get('heading', 'Section')}")
            lines.append(sec.get("content", ""))
            lines.append("")
        return Response(content="\n".join(lines), media_type="text/markdown")
