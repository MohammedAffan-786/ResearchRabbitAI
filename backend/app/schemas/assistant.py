from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class AskQuestionRequest(BaseModel):
    question: str = Field(min_length=2, description="Research inquiry question")
    paperIds: List[str] = Field(default_factory=list, description="Target paper ID contexts")
    mode: Optional[str] = "comprehensive"
    session_id: Optional[str] = None
    modelProvider: Optional[str] = None
    userApiKey: Optional[str] = None

class CitationPayload(BaseModel):
    paperId: str
    citeKey: str
    quoteSnippet: Optional[str] = None
    confidence: Optional[float] = 1.0

class AskQuestionResponse(BaseModel):
    answer: str
    citations: List[Dict[str, Any]]
    confidenceScore: float
    mode: str
    hasFullTextCoverage: bool
    sessionId: Optional[str] = None

class SessionMessageItem(BaseModel):
    id: str
    role: str
    content: str
    citations: List[Dict[str, Any]] = Field(default_factory=list)
    createdAt: str

class ResearchSessionBrief(BaseModel):
    id: str
    title: str
    mode: str
    paperIds: List[str]
    createdAt: str
    updatedAt: Optional[str] = None
    messageCount: int = 0

class ResearchSessionDetail(BaseModel):
    session: Dict[str, Any]
    messages: List[SessionMessageItem]
