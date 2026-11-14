from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from backend.app.schemas.paper import PaperBrief
from backend.app.schemas.collection import CollectionBrief

class ActivityLogRequest(BaseModel):
    activity_type: str
    title: str
    metadata_json: Optional[Dict[str, Any]] = None

class ActivityItem(BaseModel):
    id: str
    type: str
    title: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str

class TrendingTopicItem(BaseModel):
    topic: str
    paperCount: int
    growth: str

class RecommendationItem(BaseModel):
    id: str
    title: str
    authors: List[Any]
    abstract: str
    year: int
    venue: Optional[str] = None
    citationCount: int
    fieldsOfStudy: List[str]
    openAccessPdfUrl: Optional[str] = None
    recommendationReason: str

class DashboardStats(BaseModel):
    totalPapers: int
    totalCitations: int
    totalAuthors: int = 0
    graphConnections: int = 0
    openAccessCount: int
    uploadedCount: int
    totalCollections: int
    totalReviews: int

class WeeklyActivityDay(BaseModel):
    day: str
    dayName: str
    date: str
    count: int
    isToday: bool = False
    label: str

class DashboardOverviewResponse(BaseModel):
    stats: DashboardStats
    recentActivities: List[Dict[str, Any]]
    weeklyActivity: Optional[List[WeeklyActivityDay]] = None
    recentPapers: List[Dict[str, Any]]
    savedCollections: List[Dict[str, Any]]
    trendingTopics: List[TrendingTopicItem]
    recommendations: List[Dict[str, Any]]
