import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from backend.app.db.database import get_db
from backend.app.db.models import User, RefreshToken, Collection, LiteratureReview, PrismaProject, Paper
from backend.app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    get_current_user_id
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    institution: Optional[str] = None

class RefreshRequest(BaseModel):
    refresh_token: str

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    institution: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        institution=user_in.institution,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(new_user.id)
    refresh_token = create_refresh_token(new_user.id)
    new_user.refresh_token = refresh_token

    # Store refresh token hash in normalized RefreshToken model
    token_hash = hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()
    rt_record = RefreshToken(
        user_id=new_user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        is_revoked=False
    )
    db.add(rt_record)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "institution": new_user.institution
        }
    }

@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    user.refresh_token = refresh_token

    # Store refresh token hash in normalized RefreshToken model
    token_hash = hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()
    rt_record = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        is_revoked=False
    )
    db.add(rt_record)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "institution": user.institution
        }
    }

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(req: RefreshRequest, db: Session = Depends(get_db)):
    user_id = decode_refresh_token(req.refresh_token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Validate against RefreshToken table
    token_hash = hashlib.sha256(req.refresh_token.encode("utf-8")).hexdigest()
    rt = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    now_utc = datetime.now(timezone.utc)

    if rt:
        # Check if revoked or expired
        expires = rt.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if rt.is_revoked or expires < now_utc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token revoked or expired",
                headers={"WWW-Authenticate": "Bearer"}
            )
        # Revoke used refresh token for rotation
        rt.is_revoked = True
        rt.revoked_at = now_utc
    else:
        # Fallback check on user.refresh_token for existing legacy sessions
        if user.refresh_token != req.refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token invalidated",
                headers={"WWW-Authenticate": "Bearer"}
            )

    new_access_token = create_access_token(user.id)
    new_refresh_token = create_refresh_token(user.id)
    user.refresh_token = new_refresh_token

    # Record new refresh token
    new_token_hash = hashlib.sha256(new_refresh_token.encode("utf-8")).hexdigest()
    new_rt = RefreshToken(
        user_id=user.id,
        token_hash=new_token_hash,
        expires_at=now_utc + timedelta(days=7),
        is_revoked=False
    )
    db.add(new_rt)
    db.commit()

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "institution": user.institution
        }
    }

@router.post("/logout")
def logout(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.refresh_token = None
        now_utc = datetime.now(timezone.utc)
        db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id,
            RefreshToken.is_revoked == False
        ).update({"is_revoked": True, "revoked_at": now_utc})
        db.commit()
    return {"message": "Logged out successfully"}

@router.get("/me")
@router.get("/profile")
def get_current_user_profile(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    collections_count = db.query(Collection).filter(Collection.owner_id == user.id).count()
    reviews_count = db.query(LiteratureReview).filter(LiteratureReview.user_id == user.id).count()
    prisma_count = db.query(PrismaProject).filter(PrismaProject.user_id == user.id).count()
    uploaded_papers_count = db.query(Paper).filter(Paper.uploader_id == user.id).count()

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "institution": user.institution,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "stats": {
            "collectionsCount": collections_count,
            "reviewsCount": reviews_count,
            "prismaCount": prisma_count,
            "uploadedPapersCount": uploaded_papers_count
        }
    }

@router.put("/profile")
def update_profile(updates: UserProfileUpdate, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if updates.full_name is not None:
        user.full_name = updates.full_name
    if updates.institution is not None:
        user.institution = updates.institution

    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "institution": user.institution
    }
