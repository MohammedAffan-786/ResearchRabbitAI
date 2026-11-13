from backend.app.schemas.common import PaginationParams, PaginatedResponse, ErrorResponse, ErrorDetail
from backend.app.schemas.auth import UserRegisterRequest, RefreshRequest, TokenResponse, UserBrief
from backend.app.schemas.user import UserProfileResponse, UserProfileUpdateRequest, UserStats
from backend.app.schemas.paper import PaperBrief, PaperUpdate, PaperDetailResponse, PaperListResponse, PaperIntelligenceResponse
from backend.app.schemas.search import SearchFilters, SearchResponse
from backend.app.schemas.document import DocumentUploadResponse, AsyncUploadResponse, JobStatusResponse
from backend.app.schemas.assistant import AskQuestionRequest, AskQuestionResponse, ResearchSessionBrief, ResearchSessionDetail
from backend.app.schemas.graph import GraphResponse, GraphNode, GraphLink, ExpandNodeRequest, ExpandNodeResponse
from backend.app.schemas.collection import CollectionCreate, CollectionUpdate, AddPaperRequest, PaperAnnotationUpdate, CollectionBrief, CollectionDetail
from backend.app.schemas.literature_review import SynthesizeReviewRequest, LiteratureReviewResponse, PrismaProjectCreate, PrismaScreenRequest, PrismaProjectResponse
from backend.app.schemas.analytics import AnalyticsOverviewResponse
from backend.app.schemas.dashboard import DashboardOverviewResponse, ActivityLogRequest

__all__ = [
    "PaginationParams",
    "PaginatedResponse",
    "ErrorResponse",
    "ErrorDetail",
    "UserRegisterRequest",
    "RefreshRequest",
    "TokenResponse",
    "UserBrief",
    "UserProfileResponse",
    "UserProfileUpdateRequest",
    "UserStats",
    "PaperBrief",
    "PaperUpdate",
    "PaperDetailResponse",
    "PaperListResponse",
    "PaperIntelligenceResponse",
    "SearchFilters",
    "SearchResponse",
    "DocumentUploadResponse",
    "AsyncUploadResponse",
    "JobStatusResponse",
    "AskQuestionRequest",
    "AskQuestionResponse",
    "ResearchSessionBrief",
    "ResearchSessionDetail",
    "GraphResponse",
    "GraphNode",
    "GraphLink",
    "ExpandNodeRequest",
    "ExpandNodeResponse",
    "CollectionCreate",
    "CollectionUpdate",
    "AddPaperRequest",
    "PaperAnnotationUpdate",
    "CollectionBrief",
    "CollectionDetail",
    "SynthesizeReviewRequest",
    "LiteratureReviewResponse",
    "PrismaProjectCreate",
    "PrismaScreenRequest",
    "PrismaProjectResponse",
    "AnalyticsOverviewResponse",
    "DashboardOverviewResponse",
    "ActivityLogRequest"
]
