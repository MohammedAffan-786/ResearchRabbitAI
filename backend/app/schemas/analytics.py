from typing import List, Dict, Any
from pydantic import BaseModel

class YearCount(BaseModel):
    year: int
    citations: int
    paperCount: int

class FieldDistribution(BaseModel):
    field: str
    count: int
    percentage: float

class AnalyticsOverviewResponse(BaseModel):
    citationsByYear: List[Dict[str, Any]]
    fieldsDistribution: List[Dict[str, Any]]
    venueDistribution: List[Dict[str, Any]]
    readingStatusSummary: Dict[str, int]
    topInfluentialPapers: List[Dict[str, Any]]
    totalPapers: int
    totalCitations: int
