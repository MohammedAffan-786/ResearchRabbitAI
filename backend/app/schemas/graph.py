from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class GraphNode(BaseModel):
    id: str
    type: str  # paper, author, topic, institution
    label: str
    year: Optional[int] = None
    citations: Optional[int] = 0
    isSeed: Optional[bool] = False
    metadata: Dict[str, Any] = Field(default_factory=dict)

class GraphLink(BaseModel):
    id: str
    source: str
    target: str
    type: str  # citation, semantic_similarity, co_authorship, topic_shared
    label: str
    strength: float = 1.0

class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    links: List[GraphLink]
    seedPaperIds: List[str]
    stats: Dict[str, Any]

class ExpandNodeRequest(BaseModel):
    paperId: str

class ExpandNodeResponse(BaseModel):
    newNodes: List[GraphNode]
    newLinks: List[GraphLink]
