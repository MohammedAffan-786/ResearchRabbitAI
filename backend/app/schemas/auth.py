from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, description="Password with minimum 6 characters")
    full_name: Optional[str] = None
    institution: Optional[str] = None

class RefreshRequest(BaseModel):
    refresh_token: str

class UserBrief(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    institution: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserBrief
