from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class AuthorItem(BaseModel):
    name: str
    affiliation: Optional[str] = None

class PaperBrief(BaseModel):
    id: str
    title: str
    authors: List[Any] = Field(default_factory=list)
    abstract: Optional[str] = ""
    year: int
    venue: Optional[str] = None
    doi: Optional[str] = None
    arxivId: Optional[str] = None
    citationCount: int = 0
    referenceCount: int = 0
    fieldsOfStudy: List[str] = Field(default_factory=list)
    openAccessPdfUrl: Optional[str] = None
    tldr: Optional[str] = None
    source: str = "local"
    readingStatus: str = "to-read"
    userRating: int = 0
    tags: List[str] = Field(default_factory=list)
    userNotes: Optional[str] = None
    isUploaded: bool = False
    hasFullText: bool = False
    dateAdded: Optional[str] = None
    notes: Optional[str] = None

class PaperUpdate(BaseModel):
    reading_status: Optional[str] = None
    user_rating: Optional[int] = None
    user_notes: Optional[str] = None
    tags: Optional[List[str]] = None

class PaperDetailResponse(BaseModel):
    paper: PaperBrief
    similar: Dict[str, List[PaperBrief]]

class PaperListResponse(BaseModel):
    papers: List[PaperBrief]
    total: int

class PaperIntelligenceResponse(BaseModel):
    paperId: str
    title: str
    intelligence: Dict[str, Any]
