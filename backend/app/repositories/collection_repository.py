from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.models import Collection, CollectionPaper, Paper
from backend.app.repositories.base_repository import BaseRepository

class CollectionRepository(BaseRepository[Collection]):
    def __init__(self, db: Session):
        super().__init__(Collection, db)

    def list_by_user(self, user_id: Optional[str] = None, limit: int = 100) -> List[Collection]:
        query = self.db.query(Collection)
        if user_id:
            query = query.filter((Collection.owner_id == user_id) | (Collection.owner_id.is_(None)))
        return query.order_by(desc(Collection.updated_at)).limit(limit).all()

    def get_by_share_token(self, token: str) -> Optional[Collection]:
        return self.db.query(Collection).filter(Collection.share_token == token).first()

    def get_annotation(self, collection_id: str, paper_id: str) -> Optional[CollectionPaper]:
        return self.db.query(CollectionPaper).filter(
            CollectionPaper.collection_id == collection_id,
            CollectionPaper.paper_id == paper_id
        ).first()

    def add_paper(self, collection: Collection, paper: Paper) -> None:
        if paper not in collection.papers:
            collection.papers.append(paper)
            self.db.commit()
            self.db.refresh(collection)

    def remove_paper(self, collection: Collection, paper: Paper) -> None:
        if paper in collection.papers:
            collection.papers.remove(paper)
            self.db.commit()
            self.db.refresh(collection)
