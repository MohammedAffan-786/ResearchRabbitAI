from backend.app.services.embedding_provider import (
    EmbeddingProvider,
    OllamaEmbeddingProvider,
    LocalDeterministicEmbeddingProvider,
    OpenAIEmbeddingProvider,
    GeminiEmbeddingProvider,
    get_embedding_provider,
    list_embedding_providers,
)

embedding_service = get_embedding_provider()

__all__ = [
    "EmbeddingProvider",
    "OllamaEmbeddingProvider",
    "LocalDeterministicEmbeddingProvider",
    "OpenAIEmbeddingProvider",
    "GeminiEmbeddingProvider",
    "get_embedding_provider",
    "list_embedding_providers",
    "embedding_service",
]
