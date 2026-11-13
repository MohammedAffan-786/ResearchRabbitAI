import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")
    # API & App metadata
    PROJECT_NAME: str = "ResearchRabbit AI"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api"

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./researchrabbit.db")

    # Security & JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "research-rabbit-super-secret-jwt-signing-key-change-in-prod-2026")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    # Qdrant Vector Store
    QDRANT_URL: str = os.getenv("QDRANT_URL", "")
    QDRANT_API_KEY: str = os.getenv("QDRANT_API_KEY", "")
    QDRANT_COLLECTION_NAME: str = os.getenv("QDRANT_COLLECTION_NAME", "research_papers")

    # Ollama Local Free AI Engine (Primary & Default)
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_CHAT_MODEL: str = os.getenv("OLLAMA_CHAT_MODEL", "qwen3:4b")
    OLLAMA_EMBED_MODEL: str = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
    OLLAMA_API_KEY: str = os.getenv("OLLAMA_API_KEY", "")  # Optional auth token for remote Ollama in production
    OLLAMA_TIMEOUT: float = float(os.getenv("OLLAMA_TIMEOUT", "120.0"))
    OLLAMA_CONTEXT_WINDOW: int = int(os.getenv("OLLAMA_CONTEXT_WINDOW", "4096"))

    # AI Model Providers (Defaults to Ollama Free Local Engine)
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "ollama")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    # Embeddings (Defaults to Ollama nomic-embed-text)
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "ollama")

    # Scholarly Providers & API Credentials
    DEFAULT_SCHOLARLY_PROVIDER: str = os.getenv("DEFAULT_SCHOLARLY_PROVIDER", "openalex")
    SEMANTIC_SCHOLAR_API_KEY: str = os.getenv("SEMANTIC_SCHOLAR_API_KEY", "")
    OPENALEX_EMAIL: str = os.getenv("OPENALEX_EMAIL", "contact@researchrabbit.ai")
    CROSSREF_EMAIL: str = os.getenv("CROSSREF_EMAIL", "contact@researchrabbit.ai")
    SCHOLARLY_CACHE_TTL_SECONDS: int = int(os.getenv("SCHOLARLY_CACHE_TTL_SECONDS", "3600"))

    # Server & CORS
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5001",
        "http://localhost:8000",
        "https://*.vercel.app"
    ]

settings = Settings()
