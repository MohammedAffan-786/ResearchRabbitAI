from typing import Optional, Dict, Any
from pydantic import BaseModel
from backend.app.schemas.paper import PaperBrief

class DocumentUploadResponse(BaseModel):
    success: bool
    paper: PaperBrief
    message: str

class AsyncUploadResponse(BaseModel):
    jobId: str
    filename: str
    status: str
    progress: int
    stage: str

class JobStatusResponse(BaseModel):
    jobId: str
    status: str
    progress: int
    stage: str
    paperId: Optional[str] = None
    error: Optional[str] = None
    createdAt: Optional[str] = None
