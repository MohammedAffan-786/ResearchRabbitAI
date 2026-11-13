from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from backend.app.schemas.paper import PaperBrief

class SearchFilters(BaseModel):
    query: Optional[str] = None
    yearStart: Optional[int] = None
    yearEnd: Optional[int] = None
    minCitations: Optional[int] = None
    fieldOfStudy: Optional[str] = None
    openAccessOnly: Optional[bool] = None
    sortBy: Optional[str] = "relevance"
    page: Optional[int] = 1
    page_size: Optional[int] = 20

class SearchResponse(BaseModel):
    papers: List[PaperBrief]
    totalResults: int
    sourceBreakdown: Dict[str, int]
    queryTimeMs: int = 35
    page: Optional[int] = 1
    pageSize: Optional[int] = 20
    attributions: Optional[List[str]] = Field(default_factory=list)
    cached: Optional[bool] = False
