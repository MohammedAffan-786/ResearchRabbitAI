from typing import Optional, Generator
from fastapi import Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.core.security import decode_access_token, oauth2_scheme
from backend.app.core.rate_limiter import global_rate_limiter, auth_rate_limiter, upload_rate_limiter
from backend.app.schemas.common import PaginationParams
from backend.app.models import User
from backend.app.repositories.user_repository import UserRepository
from backend.app.repositories.paper_repository import PaperRepository
from backend.app.repositories.collection_repository import CollectionRepository
from backend.app.repositories.document_repository import DocumentRepository
from backend.app.repositories.session_repository import SessionRepository
from backend.app.repositories.review_repository import ReviewRepository
from backend.app.repositories.activity_repository import ActivityRepository

def rate_limit_global(request: Request):
    """Enforces global rate limits per client IP."""
    global_rate_limiter.check(request)

def rate_limit_auth(request: Request):
    """Enforces stricter rate limits on authentication routes."""
    auth_rate_limiter.check(request)

def rate_limit_upload(request: Request):
    """Enforces rate limits on file uploads."""
    upload_rate_limiter.check(request)

def get_pagination(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page")
) -> PaginationParams:
    return PaginationParams(page=page, page_size=page_size)

def get_current_user_id(token: Optional[str] = Depends(oauth2_scheme)) -> str:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    user_id = decode_access_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user_id

def get_optional_current_user_id(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[str]:
    if not token:
        return None
    return decode_access_token(token)

def get_current_user(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user

# Repository Injections
def get_user_repository(db: Session = Depends(get_db)) -> UserRepository:
    return UserRepository(db)

def get_paper_repository(db: Session = Depends(get_db)) -> PaperRepository:
    return PaperRepository(db)

def get_collection_repository(db: Session = Depends(get_db)) -> CollectionRepository:
    return CollectionRepository(db)

def get_document_repository(db: Session = Depends(get_db)) -> DocumentRepository:
    return DocumentRepository(db)

def get_session_repository(db: Session = Depends(get_db)) -> SessionRepository:
    return SessionRepository(db)

def get_review_repository(db: Session = Depends(get_db)) -> ReviewRepository:
    return ReviewRepository(db)

def get_activity_repository(db: Session = Depends(get_db)) -> ActivityRepository:
    return ActivityRepository(db)
