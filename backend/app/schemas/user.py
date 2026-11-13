from typing import Optional, Dict, Any
from pydantic import BaseModel

class UserProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    institution: Optional[str] = None

class UserStats(BaseModel):
    collectionsCount: int = 0
    reviewsCount: int = 0
    prismaCount: int = 0
    uploadedPapersCount: int = 0

class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    institution: Optional[str] = None
    created_at: Optional[str] = None
    stats: Optional[UserStats] = None
