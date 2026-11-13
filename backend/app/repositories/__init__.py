from backend.app.repositories.base_repository import BaseRepository
from backend.app.repositories.user_repository import UserRepository
from backend.app.repositories.paper_repository import PaperRepository
from backend.app.repositories.collection_repository import CollectionRepository
from backend.app.repositories.document_repository import DocumentRepository
from backend.app.repositories.session_repository import SessionRepository
from backend.app.repositories.review_repository import ReviewRepository
from backend.app.repositories.activity_repository import ActivityRepository

__all__ = [
    "BaseRepository",
    "UserRepository",
    "PaperRepository",
    "CollectionRepository",
    "DocumentRepository",
    "SessionRepository",
    "ReviewRepository",
    "ActivityRepository"
]
