from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.models import LiteratureReview, PrismaProject
from backend.app.repositories.base_repository import BaseRepository

class ReviewRepository(BaseRepository[LiteratureReview]):
    def __init__(self, db: Session):
        super().__init__(LiteratureReview, db)

    def list_by_user(self, user_id: Optional[str] = None) -> List[LiteratureReview]:
        query = self.db.query(LiteratureReview)
        if user_id:
            query = query.filter((LiteratureReview.user_id == user_id) | (LiteratureReview.user_id.is_(None)))
        return query.order_by(desc(LiteratureReview.created_at)).all()

    def list_prisma_projects(self, user_id: Optional[str] = None) -> List[PrismaProject]:
        query = self.db.query(PrismaProject)
        if user_id:
            query = query.filter((PrismaProject.user_id == user_id) | (PrismaProject.user_id.is_(None)))
        return query.order_by(desc(PrismaProject.created_at)).all()

    def get_prisma_project(self, project_id: str) -> Optional[PrismaProject]:
        return self.db.query(PrismaProject).filter(PrismaProject.id == project_id).first()
