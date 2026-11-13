from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class SynthesizeReviewRequest(BaseModel):
    topic: str = Field(min_length=2)
    paperIds: List[str] = Field(min_length=1)
    collectionName: Optional[str] = None

class LiteratureReviewResponse(BaseModel):
    id: str
    title: str
    topic: str
    paperIds: List[str]
    executiveSummary: str
    sections: List[Dict[str, Any]]
    synthesisMatrix: List[Dict[str, Any]]
    prismaStats: Optional[Dict[str, Any]] = None
    createdAt: str
    updatedAt: Optional[str] = None

class PrismaProjectCreate(BaseModel):
    title: str
    researchQuestion: str

class PrismaScreenRequest(BaseModel):
    paperId: str
    stage: str
    exclusionReason: Optional[str] = None

class PrismaProjectResponse(BaseModel):
    id: str
    title: str
    researchQuestion: str
    identifiedCount: int
    screenedCount: int
    eligibleCount: int
    includedCount: int
    excludedCount: int
    flowchartData: Dict[str, Any]
    createdAt: str
