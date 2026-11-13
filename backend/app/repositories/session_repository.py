from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.models import ResearchSession, ChatMessage
from backend.app.repositories.base_repository import BaseRepository

class SessionRepository(BaseRepository[ResearchSession]):
    def __init__(self, db: Session):
        super().__init__(ResearchSession, db)

    def list_by_user(self, user_id: Optional[str] = None, limit: int = 50) -> List[ResearchSession]:
        query = self.db.query(ResearchSession)
        if user_id:
            query = query.filter(ResearchSession.user_id == user_id)
        return query.order_by(desc(ResearchSession.updated_at)).limit(limit).all()

    def get_messages(self, session_id: str) -> List[ChatMessage]:
        return self.db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()

    def add_message(self, message: ChatMessage) -> ChatMessage:
        self.db.add(message)
        self.db.commit()
        return message
