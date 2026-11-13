from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from backend.app.schemas.paper import PaperBrief

class CollectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = ""
    color: Optional[str] = "#3b82f6"
    icon: Optional[str] = "Folder"
    tags: Optional[List[str]] = None

class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None

class AddPaperRequest(BaseModel):
    paperId: str

class PaperAnnotationUpdate(BaseModel):
    notes: Optional[str] = None
    rating: Optional[int] = None

class CollectionBrief(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    color: str
    icon: str
    isPublic: bool
    shareToken: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    paperCount: int
    paperIds: List[str] = Field(default_factory=list)
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class CollectionDetail(CollectionBrief):
    papers: List[PaperBrief] = Field(default_factory=list)

class CollectionSearchResponse(BaseModel):
    collectionId: str
    collectionName: str
    query: str
    results: List[PaperBrief]
    total: int

class CollectionSummaryResponse(BaseModel):
    collectionId: str
    collectionName: str
    summary: str
    paperCount: int

class CollectionShareResponse(BaseModel):
    id: str
    isPublic: bool
    shareToken: str
    shareUrl: Optional[str] = None
