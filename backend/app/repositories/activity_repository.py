from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.models import UserActivity
from backend.app.repositories.base_repository import BaseRepository

class ActivityRepository(BaseRepository[UserActivity]):
    def __init__(self, db: Session):
        super().__init__(UserActivity, db)

    def list_recent(self, user_id: Optional[str] = None, limit: int = 10) -> List[UserActivity]:
        query = self.db.query(UserActivity)
        if user_id:
            query = query.filter((UserActivity.user_id == user_id) | (UserActivity.user_id.is_(None)))
        return query.order_by(desc(UserActivity.created_at)).limit(limit).all()

    def log(self, activity: UserActivity) -> UserActivity:
        self.db.add(activity)
        try:
            self.db.commit()
            self.db.refresh(activity)
        except Exception:
            self.db.rollback()
        return activity
