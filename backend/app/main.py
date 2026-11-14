# ResearchRabbit AI Platform
# Architected and Developed by Mohammed Affan
# Repository: https://github.com/MohammedAffan-786/ResearchRabbitAI

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.core.exceptions import AppException
from backend.app.core.logging import logger, log_security_event
from backend.app.db.init_db import init_database
from backend.app.services.qdrant_service import qdrant_service
from backend.app.services.embeddings.embedding_service import get_embedding_provider
from backend.app.api.routes import (
    auth_router,
    users_router,
    search_router,
    papers_router,
    documents_router,
    assistant_router,
    graph_router,
    collections_router,
    literature_reviews_router,
    analytics_router,
    dashboard_router,
    export_router
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize SQL database and Qdrant vector collection
    print("🐇 Initializing ResearchRabbit AI Platform...")
    init_database()
    embed_provider = get_embedding_provider()
    qdrant_service.init_collection(vector_size=embed_provider.dimension)
    print("✨ ResearchRabbit AI ready! Database & Qdrant vector store connected.")
    yield
    print("🐇 ResearchRabbit AI shutting down cleanly.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Next-generation academic literature discovery, interactive citation network, and systematic literature review intelligence platform.",
    lifespan=lifespan
)

# ------------------------------------------------------------------------------
# Consistent Global Error Handling
# ------------------------------------------------------------------------------

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    headers = {}
    if exc.status_code == 429:
        retry_sec = str(exc.details.get("retry_after", 60))
        headers["Retry-After"] = retry_sec
        log_security_event(
            event_type="RATE_LIMIT_BLOCKED",
            ip_address=request.client.host if request.client else "unknown",
            resource=request.url.path,
            details=f"Retry-After: {retry_sec}s",
            severity="WARNING"
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details
            },
            "detail": exc.message
        },
        headers=headers
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request parameters or payload",
                "details": exc.errors()
            },
            "detail": exc.errors()
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code in (401, 403):
        log_security_event(
            event_type=f"ACCESS_DENIED_{exc.status_code}",
            ip_address=request.client.host if request.client else "unknown",
            resource=request.url.path,
            details=str(exc.detail),
            severity="WARNING"
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": str(exc.detail),
                "details": {}
            },
            "detail": exc.detail
        },
        headers=exc.headers
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled server error on {request.method} {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred. Please try again later.",
                "details": {}
            },
            "detail": "An internal server error occurred. Please try again later."
        }
    )

# ------------------------------------------------------------------------------
# Security Middleware & CORS Configuration
# ------------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$|^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# API Routes Mounting under /api
# ------------------------------------------------------------------------------

app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(search_router, prefix=settings.API_V1_STR)
app.include_router(papers_router, prefix=settings.API_V1_STR)
app.include_router(documents_router, prefix=settings.API_V1_STR)
app.include_router(assistant_router, prefix=settings.API_V1_STR)
app.include_router(graph_router, prefix=settings.API_V1_STR)
app.include_router(collections_router, prefix=settings.API_V1_STR)
app.include_router(literature_reviews_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(export_router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "connected",
        "vector_store": "qdrant_connected"
    }

@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "docs_url": "/docs",
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
