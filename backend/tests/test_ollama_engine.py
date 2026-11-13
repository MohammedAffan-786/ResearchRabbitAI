import os
import json
import pytest
import httpx
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.services.llm_provider import (
    OllamaLLMProvider,
    get_llm_provider,
    list_llm_providers,
    AIProviderError
)
from backend.app.services.embedding_provider import (
    OllamaEmbeddingProvider,
    get_embedding_provider,
    list_embedding_providers
)
from backend.app.core.cache import embedding_cache
from backend.app.services.rag.rag_service import rag_service
from backend.app.models import Paper

client = TestClient(app)

def test_ollama_llm_provider_initialization():
    """Verify Ollama provider configures qwen3:4b by default and supports qwen3:8b."""
    provider_4b = get_llm_provider("ollama")
    assert isinstance(provider_4b, OllamaLLMProvider)
    assert provider_4b.provider_name == "ollama"
    assert provider_4b.model_name == "qwen3:4b"
    assert provider_4b.base_url == settings.OLLAMA_BASE_URL.rstrip("/")

    # Switch to qwen3:8b
    provider_8b = get_llm_provider("qwen3:8b")
    assert isinstance(provider_8b, OllamaLLMProvider)
    assert provider_8b.model_name == "qwen3:8b"


@pytest.mark.asyncio
async def test_ollama_chat_generation_mock():
    """Verify Ollama /api/chat invocation and structured academic response parsing."""
    ollama_p = OllamaLLMProvider(model="qwen3:4b")

    mock_ollama_response = {
        "model": "qwen3:4b",
        "created_at": "2026-11-13T20:00:00Z",
        "message": {
            "role": "assistant",
            "content": "Attention mechanisms replace recurrent layers by directly computing pairwise token interactions [Vaswani et al., 2017]."
        },
        "done": True
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = mock_ollama_response
    mock_resp.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp

        result = await ollama_p.generate(
            prompt="Explain how self-attention replaces recurrent units.",
            system_prompt="You are an academic researcher."
        )

        assert "Attention mechanisms replace recurrent layers" in result
        assert mock_post.called
        call_kwargs = mock_post.call_args[1]
        assert call_kwargs["json"]["model"] == "qwen3:4b"
        assert len(call_kwargs["json"]["messages"]) == 2
        assert call_kwargs["json"]["stream"] is False


@pytest.mark.asyncio
async def test_ollama_streaming_response():
    """Verify token streaming generator yields real-time chunks from Ollama."""
    ollama_p = OllamaLLMProvider(model="qwen3:4b")

    mock_lines = [
        json.dumps({"message": {"content": "Self-attention "}}),
        json.dumps({"message": {"content": "computes token similarity "}}),
        json.dumps({"message": {"content": "in parallel [Vaswani et al., 2017]."}}),
    ]

    async def mock_aiter_lines():
        for line in mock_lines:
            yield line

    mock_stream_resp = MagicMock()
    mock_stream_resp.status_code = 200
    mock_stream_resp.raise_for_status = MagicMock()
    mock_stream_resp.aiter_lines = mock_aiter_lines

    class MockStreamContext:
        async def __aenter__(self):
            return mock_stream_resp
        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

    with patch("httpx.AsyncClient.stream", return_value=MockStreamContext()):
        collected_tokens = []
        async for token in ollama_p.generate_stream("What is self-attention?"):
            collected_tokens.append(token)

        full_text = "".join(collected_tokens)
        assert "Self-attention computes token similarity in parallel" in full_text
        assert len(collected_tokens) == 3


@pytest.mark.asyncio
async def test_ollama_offline_informative_error():
    """Verify informative error with model pull instructions when Ollama is offline."""
    ollama_p = OllamaLLMProvider(model="qwen3:4b")

    with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectError("Connection refused")):
        with pytest.raises(AIProviderError) as exc_info:
            await ollama_p.generate("Test prompt")

        err_msg = str(exc_info.value)
        assert "Ollama local AI server is not reachable" in err_msg
        assert "ollama serve" in err_msg
        assert "ollama pull qwen3:4b" in err_msg


def test_ollama_embedding_provider_initialization():
    """Verify nomic-embed-text provider has 768 dimensions and correct defaults."""
    emb_p = get_embedding_provider("ollama")
    assert isinstance(emb_p, OllamaEmbeddingProvider)
    assert emb_p.provider_name == "ollama"
    assert emb_p.dimension == 768
    assert emb_p.model == "nomic-embed-text"


@pytest.mark.asyncio
async def test_ollama_embedding_generation_and_caching():
    """Verify nomic-embed-text generates 768d vectors via /api/embed with caching."""
    await embedding_cache.clear()
    emb_p = OllamaEmbeddingProvider(model="nomic-embed-text", dim=768)

    sample_768_vec = [0.05] * 768

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"embeddings": [sample_768_vec]}
    mock_resp.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp

        # 1. Generate embedding
        vectors = await emb_p.embed_texts(["Quantum algorithm optimization"])
        assert len(vectors) == 1
        assert len(vectors[0]) == 768

        # 2. Query embedding with caching
        q_vec = await emb_p.embed_query("Quantum algorithm optimization")
        assert len(q_vec) == 768
        assert embedding_cache.stats()["size"] >= 1

        # Query again -> must trigger cache hit without calling Ollama post
        call_count_before = mock_post.call_count
        cached_vec = await emb_p.embed_query("Quantum algorithm optimization")
        assert cached_vec == q_vec
        assert mock_post.call_count == call_count_before  # No new network request


def test_provider_status_endpoints_surface_ollama():
    """Verify /api/assistant/providers surfaces Ollama and Qwen models transparently."""
    resp = client.get("/api/assistant/providers")
    assert resp.status_code == 200
    data = resp.json()

    # Verify LLM providers
    llm_ids = [p["id"] for p in data["llmProviders"]]
    assert "ollama" in llm_ids
    assert "qwen3:8b" in llm_ids
    first_llm = data["llmProviders"][0]
    assert first_llm["id"] == "ollama"
    assert first_llm["requires_api_key"] is False

    # Verify Embedding providers
    emb_ids = [p["id"] for p in data["embeddingProviders"]]
    assert "ollama" in emb_ids
    first_emb = data["embeddingProviders"][0]
    assert first_emb["id"] == "ollama"
    assert first_emb["dimension"] == 768
    assert first_emb["model"] == "nomic-embed-text"
