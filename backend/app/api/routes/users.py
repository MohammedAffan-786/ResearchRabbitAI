from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.dependencies import get_db, get_current_user_id, get_user_repository
from backend.app.repositories.user_repository import UserRepository
from backend.app.models import Collection, LiteratureReview, PrismaProject, Paper
from backend.app.schemas.user import UserProfileResponse, UserProfileUpdateRequest, UserStats

router = APIRouter(tags=["Users"])

@router.get("/auth/me", response_model=UserProfileResponse)
@router.get("/auth/profile", response_model=UserProfileResponse)
@router.get("/users/me", response_model=UserProfileResponse)
def get_user_profile(
    user_id: str = Depends(get_current_user_id),
    user_repo: UserRepository = Depends(get_user_repository),
    db: Session = Depends(get_db)
):
    user = user_repo.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    collections_count = db.query(Collection).filter(Collection.owner_id == user.id).count()
    reviews_count = db.query(LiteratureReview).filter(LiteratureReview.user_id == user.id).count()
    prisma_count = db.query(PrismaProject).filter(PrismaProject.user_id == user.id).count()
    uploaded_papers_count = db.query(Paper).filter(Paper.uploader_id == user.id).count()

    return UserProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        institution=user.institution,
        created_at=user.created_at.isoformat() if user.created_at else None,
        stats=UserStats(
            collectionsCount=collections_count,
            reviewsCount=reviews_count,
            prismaCount=prisma_count,
            uploadedPapersCount=uploaded_papers_count
        )
    )

@router.put("/auth/profile", response_model=UserProfileResponse)
@router.put("/users/me", response_model=UserProfileResponse)
def update_user_profile(
    updates: UserProfileUpdateRequest,
    user_id: str = Depends(get_current_user_id),
    user_repo: UserRepository = Depends(get_user_repository),
    db: Session = Depends(get_db)
):
    user = user_repo.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if updates.full_name is not None:
        user.full_name = updates.full_name
    if updates.institution is not None:
        user.institution = updates.institution

    db.commit()
    db.refresh(user)

    return UserProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        institution=user.institution,
        created_at=user.created_at.isoformat() if user.created_at else None
    )
