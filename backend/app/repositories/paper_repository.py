from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.models import Paper, Author, PaperAuthor, Citation, ResearchTopic, PaperTopic
from backend.app.repositories.base_repository import BaseRepository

class PaperRepository(BaseRepository[Paper]):
    def __init__(self, db: Session):
        super().__init__(Paper, db)

    def get_by_doi(self, doi: str) -> Optional[Paper]:
        return self.db.query(Paper).filter(Paper.doi == doi).first()

    def get_by_arxiv_id(self, arxiv_id: str) -> Optional[Paper]:
        return self.db.query(Paper).filter(Paper.arxiv_id == arxiv_id).first()

    def get_by_normalized_title_and_year(self, title_normalized: str, year: int) -> Optional[Paper]:
        return self.db.query(Paper).filter(
            Paper.title_normalized == title_normalized,
            Paper.year.between(year - 1, year + 1)
        ).first()

    def list_all(self, skip: int = 0, limit: int = 100) -> List[Paper]:
        return self.db.query(Paper).order_by(desc(Paper.date_added)).offset(skip).limit(limit).all()

    def get_recent(self, limit: int = 6) -> List[Paper]:
        return self.db.query(Paper).order_by(desc(Paper.date_added)).limit(limit).all()

    def get_highest_impact(self, limit: int = 5) -> List[Paper]:
        return self.db.query(Paper).order_by(desc(Paper.citation_count)).limit(limit).all()
