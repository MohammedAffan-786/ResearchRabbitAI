from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.db.models import Paper

router = APIRouter(prefix="/analytics", tags=["Research Analytics"])

@router.get("/overview")
def get_research_analytics(db: Session = Depends(get_db)):
    papers = db.query(Paper).all()
    if not papers:
        return {
            "citationsByYear": [],
            "fieldsDistribution": [],
            "impactBreakdown": [],
            "topAuthors": []
        }

    # 1. Citations & Paper count by publication year
    year_data: Dict[int, Dict[str, int]] = {}
    for p in papers:
        yr = p.year or 2024
        if yr not in year_data:
            year_data[yr] = {"year": yr, "citations": 0, "paperCount": 0}
        year_data[yr]["citations"] += (p.citation_count or 0)
        year_data[yr]["paperCount"] += 1

    citations_by_year = sorted(year_data.values(), key=lambda x: x["year"])

    # 2. Fields of Study distribution
    field_counts: Dict[str, int] = {}
    for p in papers:
        for f in (p.fields_of_study or ["Multidisciplinary"]):
            field_name = str(f).title()
            field_counts[field_name] = field_counts.get(field_name, 0) + 1

    fields_distribution = [
        {"field": k, "count": v}
        for k, v in sorted(field_counts.items(), key=lambda x: x[1], reverse=True)[:8]
    ]

    # 3. Citation Impact Tiers
    impact_tiers = {"< 100": 0, "100 - 1k": 0, "1k - 10k": 0, "> 10k": 0}
    for p in papers:
        c = p.citation_count or 0
        if c < 100:
            impact_tiers["< 100"] += 1
        elif c < 1000:
            impact_tiers["100 - 1k"] += 1
        elif c < 10000:
            impact_tiers["1k - 10k"] += 1
        else:
            impact_tiers["> 10k"] += 1

    impact_breakdown = [{"tier": k, "count": v} for k, v in impact_tiers.items()]

    # 4. Top Cited Authors
    author_citations: Dict[str, Dict[str, Any]] = {}
    for p in papers:
        for a in (p.authors or []):
            name = a.get("name")
            if name and "et al" not in name.lower() and len(name) > 3:
                if name not in author_citations:
                    author_citations[name] = {"author": name, "citations": 0, "papers": 0}
                author_citations[name]["citations"] += (p.citation_count or 0)
                author_citations[name]["papers"] += 1

    top_authors = sorted(author_citations.values(), key=lambda x: x["citations"], reverse=True)[:7]

    return {
        "citationsByYear": citations_by_year,
        "fieldsDistribution": fields_distribution,
        "impactBreakdown": impact_breakdown,
        "topAuthors": top_authors,
        "totalPapers": len(papers),
        "totalCitations": sum(p.citation_count or 0 for p in papers)
    }
