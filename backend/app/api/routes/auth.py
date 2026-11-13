import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from backend.app.core.dependencies import get_db, rate_limit_auth, get_user_repository
from backend.app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    get_current_user_id
)
from backend.app.models import User, RefreshToken
from backend.app.repositories.user_repository import UserRepository
from backend.app.schemas.auth import UserRegisterRequest, RefreshRequest, TokenResponse, UserBrief

router = APIRouter(prefix="/auth", tags=["Authentication"], dependencies=[Depends(rate_limit_auth)])

@router.post("/register", response_model=TokenResponse)
def register(
    user_in: UserRegisterRequest,
    user_repo: UserRepository = Depends(get_user_repository)
):
    existing = user_repo.get_by_email(user_in.email)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        institution=user_in.institution,
        is_active=True
    )
    user_repo.create(new_user)

    access_token = create_access_token(new_user.id)
    refresh_token = create_refresh_token(new_user.id)
    new_user.refresh_token = refresh_token

    # Store refresh token in RefreshToken table
    token_hash = hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()
    rt_record = RefreshToken(
        user_id=new_user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        is_revoked=False
    )
    user_repo.store_refresh_token(rt_record)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserBrief(
            id=new_user.id,
            email=new_user.email,
            full_name=new_user.full_name,
            institution=new_user.institution
        )
    )

@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    user_repo: UserRepository = Depends(get_user_repository)
):
    user = user_repo.get_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    user.refresh_token = refresh_token

    token_hash = hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()
    rt_record = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        is_revoked=False
    )
    user_repo.store_refresh_token(rt_record)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserBrief(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            institution=user.institution
        )
    )

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    req: RefreshRequest,
    user_repo: UserRepository = Depends(get_user_repository)
):
    user_id = decode_refresh_token(req.refresh_token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = user_repo.get(user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token_hash = hashlib.sha256(req.refresh_token.encode("utf-8")).hexdigest()
    rt = user_repo.get_refresh_token(token_hash)
    now_utc = datetime.now(timezone.utc)

    if rt:
        expires = rt.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if rt.is_revoked or expires < now_utc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token revoked or expired",
                headers={"WWW-Authenticate": "Bearer"}
            )
        rt.is_revoked = True
        rt.revoked_at = now_utc
    else:
        if user.refresh_token != req.refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token invalidated",
                headers={"WWW-Authenticate": "Bearer"}
            )

    new_access_token = create_access_token(user.id)
    new_refresh_token = create_refresh_token(user.id)
    user.refresh_token = new_refresh_token

    new_token_hash = hashlib.sha256(new_refresh_token.encode("utf-8")).hexdigest()
    new_rt = RefreshToken(
        user_id=user.id,
        token_hash=new_token_hash,
        expires_at=now_utc + timedelta(days=7),
        is_revoked=False
    )
    user_repo.store_refresh_token(new_rt)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=UserBrief(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            institution=user.institution
        )
    )

@router.post("/logout")
def logout(
    user_id: str = Depends(get_current_user_id),
    user_repo: UserRepository = Depends(get_user_repository)
):
    user = user_repo.get(user_id)
    if user:
        user.refresh_token = None
        user_repo.revoke_user_refresh_tokens(user_id)
    return {"message": "Logged out successfully"}
