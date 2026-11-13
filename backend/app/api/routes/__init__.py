from backend.app.api.routes.auth import router as auth_router
from backend.app.api.routes.users import router as users_router
from backend.app.api.routes.search import router as search_router
from backend.app.api.routes.papers import router as papers_router
from backend.app.api.routes.documents import router as documents_router
from backend.app.api.routes.assistant import router as assistant_router
from backend.app.api.routes.graph import router as graph_router
from backend.app.api.routes.collections import router as collections_router
from backend.app.api.routes.literature_reviews import router as literature_reviews_router
from backend.app.api.routes.analytics import router as analytics_router
from backend.app.api.routes.dashboard import router as dashboard_router
from backend.app.api.routes.export import router as export_router

__all__ = [
    "auth_router",
    "users_router",
    "search_router",
    "papers_router",
    "documents_router",
    "assistant_router",
    "graph_router",
    "collections_router",
    "literature_reviews_router",
    "analytics_router",
    "dashboard_router",
    "export_router"
]
