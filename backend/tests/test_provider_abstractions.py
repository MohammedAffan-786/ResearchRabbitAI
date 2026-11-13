import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.cache import scholarly_cache, embedding_cache
from backend.app.services.scholarly_apis import (
    ScholarlyProvider,
    openalex_provider,
    crossref_provider,
    semantic_scholar_provider,
    arxiv_provider,
    scholarly_orchestrator,
    ScholarlyProviderError,
    RateLimitExceededError,
    ProviderUnavailableError,
    AllScholarlyProvidersFailedError,
)
from backend.app.services.llm_provider import (
    LLMProvider,
    OpenAILLMProvider,
    AnthropicLLMProvider,
    GeminiLLMProvider,
    LocalSmartProvider,
    get_llm_provider,
    list_llm_providers,
    AIProviderError,
)
from backend.app.services.embedding_provider import (
    EmbeddingProvider,
    LocalDeterministicEmbeddingProvider,
    OpenAIEmbeddingProvider,
    GeminiEmbeddingProvider,
    get_embedding_provider,
    list_embedding_providers,
)

client = TestClient(app)

# -------------------------------------------------------------
# 1. Scholarly Data Providers Interface & Attribution Tests
# -------------------------------------------------------------
def test_scholarly_provider_interfaces():
    providers = [openalex_provider, crossref_provider, semantic_scholar_provider, arxiv_provider]

    for p in providers:
        assert isinstance(p, ScholarlyProvider)
        assert isinstance(p.provider_id, str) and len(p.provider_id) > 0
        assert isinstance(p.display_name, str) and len(p.display_name) > 0
        assert isinstance(p.attribution, str) and len(p.attribution) > 0
        assert isinstance(p.terms_of_service_url, str) and p.terms_of_service_url.startswith("http")
        assert p.is_available is True

    # Verify specific attributions
    assert "OpenAlex" in openalex_provider.attribution
    assert "Crossref" in crossref_provider.attribution
    assert "Semantic Scholar" in semantic_scholar_provider.attribution
    assert "arXiv" in arxiv_provider.attribution


# -------------------------------------------------------------
# 2. Scholarly In-Memory Caching Layer
# -------------------------------------------------------------
@pytest.mark.asyncio
async def test_scholarly_caching_layer():
    await scholarly_cache.clear()

    key = "test_query:attention"
    payload = {"papers": [{"id": "p1", "title": "Test Paper"}], "source_breakdown": {"test": 1}}

    # Miss
    cached = await scholarly_cache.get(key)
    assert cached is None

    # Set and hit
    await scholarly_cache.set(key, payload, ttl_seconds=60)
    cached = await scholarly_cache.get(key)
    assert cached == payload
    assert cached["papers"][0]["title"] == "Test Paper"

    stats = scholarly_cache.stats()
    assert stats["hits"] >= 1
    assert stats["misses"] >= 1


# -------------------------------------------------------------
# 3. Provider Switching without Rewriting Business Logic
# -------------------------------------------------------------
@pytest.mark.asyncio
async def test_scholarly_orchestrator_switching():
    await scholarly_cache.clear()

    # Mock provider responses
    sample_paper = {
        "id": "crossref-10.1145-test",
        "title": "Crossref Test Manuscript",
        "authors": [{"name": "Dr. Crossref"}],
        "year": 2023,
        "venue": "ACM Transactions",
        "citation_count": 45,
        "source": "crossref"
    }

    with patch.object(crossref_provider, "search", new_callable=AsyncMock) as mock_cr, \
         patch.object(openalex_provider, "search", new_callable=AsyncMock) as mock_oa:

        mock_cr.return_value = [sample_paper]
        mock_oa.return_value = []

        # Query only Crossref
        res = await scholarly_orchestrator.search("transformer", provider_name="crossref", use_cache=False)
        assert mock_cr.called
        assert not mock_oa.called
        assert len(res["papers"]) == 1
        assert res["papers"][0]["title"] == "Crossref Test Manuscript"
        assert "crossref" in res["source_breakdown"]


# -------------------------------------------------------------
# 4. Failover & Never Silently Replace with Fake Sample Results
# -------------------------------------------------------------
@pytest.mark.asyncio
async def test_scholarly_failover_and_strict_authentic_search():
    await scholarly_cache.clear()

    # Case A: One provider fails, but another succeeds (resilient failover)
    with patch.object(openalex_provider, "search", side_effect=ProviderUnavailableError("OpenAlex", "Timeout")), \
         patch.object(crossref_provider, "search", new_callable=AsyncMock) as mock_cr, \
         patch.object(semantic_scholar_provider, "search", new_callable=AsyncMock) as mock_s2, \
         patch.object(arxiv_provider, "search", new_callable=AsyncMock) as mock_arx:

        mock_cr.return_value = [{"id": "cr-1", "title": "Failover Paper", "authors": [], "year": 2024, "source": "crossref"}]
        mock_s2.return_value = []
        mock_arx.return_value = []

        res = await scholarly_orchestrator.search("machine learning", provider_name="all", use_cache=False)
        assert len(res["papers"]) == 1
        assert res["papers"][0]["title"] == "Failover Paper"
        assert "openalex" in res["errors"]

    # Case B: ALL providers fail -> must raise AllScholarlyProvidersFailedError (NEVER return fake mock results)
    with patch.object(openalex_provider, "search", side_effect=ProviderUnavailableError("OpenAlex", "503 Down")), \
         patch.object(crossref_provider, "search", side_effect=ProviderUnavailableError("Crossref", "503 Down")), \
         patch.object(semantic_scholar_provider, "search", side_effect=RateLimitExceededError("SemanticScholar", 60)), \
         patch.object(arxiv_provider, "search", side_effect=ProviderUnavailableError("arXiv", "Connection reset")):

        with pytest.raises(AllScholarlyProvidersFailedError) as exc_info:
            await scholarly_orchestrator.search("neural network", provider_name="all", use_cache=False)

        assert "OpenAlex" in str(exc_info.value)
        assert "Crossref" in str(exc_info.value)


# -------------------------------------------------------------
# 5. Configurable LLM APIs & Provider Abstraction
# -------------------------------------------------------------
def test_llm_provider_switching_and_credential_handling():
    # 1. Built-in Local Provider (no external key required)
    local_p = get_llm_provider("builtin")
    assert isinstance(local_p, LocalSmartProvider)
    assert local_p.provider_name == "builtin"
    assert local_p.is_available is True

    # 2. OpenAI Provider with credentials
    openai_p = get_llm_provider("openai", api_key="sk-test-openai-key", model="gpt-4o")
    assert isinstance(openai_p, OpenAILLMProvider)
    assert openai_p.provider_name == "openai"
    assert openai_p.model_name == "gpt-4o"
    assert openai_p.is_available is True

    # 3. Anthropic Provider with credentials
    ant_p = get_llm_provider("anthropic", api_key="sk-ant-test-key", model="claude-3-5-sonnet-20241022")
    assert isinstance(ant_p, AnthropicLLMProvider)
    assert ant_p.provider_name == "anthropic"
    assert ant_p.is_available is True

    # 4. Gemini Provider with credentials
    gem_p = get_llm_provider("gemini", api_key="AIzaSyTestKey", model="gemini-1.5-pro")
    assert isinstance(gem_p, GeminiLLMProvider)
    assert gem_p.provider_name == "gemini"
    assert gem_p.is_available is True

    # 5. Missing Key Fallback to Local Builtin
    fallback_p = get_llm_provider("openai", api_key="")
    assert isinstance(fallback_p, LocalSmartProvider)

    # 6. List Providers
    providers_list = list_llm_providers()
    assert len(providers_list) >= 4
    provider_ids = [p["id"] for p in providers_list]
    assert "builtin" in provider_ids
    assert "openai" in provider_ids
    assert "anthropic" in provider_ids
    assert "gemini" in provider_ids


# -------------------------------------------------------------
# 6. Configurable Embedding APIs & Vector Caching
# -------------------------------------------------------------
@pytest.mark.asyncio
async def test_embedding_provider_switching_and_caching():
    await embedding_cache.clear()

    # 1. Local Deterministic Provider (384 dimensions)
    local_emb = get_embedding_provider("local")
    assert isinstance(local_emb, LocalDeterministicEmbeddingProvider)
    assert local_emb.dimension == 384
    assert local_emb.provider_name == "local"

    vec1 = await local_emb.embed_query("quantum computing qubits")
    assert len(vec1) == 384
    # Check L2-normalization
    norm = sum(x * x for x in vec1) ** 0.5
    assert abs(norm - 1.0) < 1e-4

    # 2. Embedding Cache Hit on identical query
    vec2 = await local_emb.embed_query("quantum computing qubits")
    assert vec1 == vec2
    stats = embedding_cache.stats()
    assert stats["hits"] >= 1

    # 3. OpenAI Provider
    openai_emb = get_embedding_provider("openai", api_key="sk-test-key")
    assert isinstance(openai_emb, OpenAIEmbeddingProvider)
    assert openai_emb.dimension == 1536

    # 4. Gemini Provider
    gemini_emb = get_embedding_provider("gemini", api_key="AIzaTestKey")
    assert isinstance(gemini_emb, GeminiEmbeddingProvider)
    assert gemini_emb.dimension == 768

    # 5. List Embedding Providers
    emb_list = list_embedding_providers()
    assert len(emb_list) >= 3


# -------------------------------------------------------------
# 7. HTTP API Provider Endpoints
# -------------------------------------------------------------
def test_provider_http_endpoints():
    # 1. Scholarly Providers endpoint
    resp = client.get("/api/search/providers")
    assert resp.status_code == 200
    data = resp.json()
    assert "providers" in data
    assert len(data["providers"]) >= 4
    provider_ids = [p["id"] for p in data["providers"]]
    assert "openalex" in provider_ids
    assert "crossref" in provider_ids
    assert "semantic_scholar" in provider_ids
    assert "arxiv" in provider_ids
    assert "cacheStats" in data

    # 2. AI Providers endpoint
    resp_ai = client.get("/api/assistant/providers")
    assert resp_ai.status_code == 200
    data_ai = resp_ai.json()
    assert "llmProviders" in data_ai
    assert "embeddingProviders" in data_ai
    assert len(data_ai["llmProviders"]) >= 4
    assert len(data_ai["embeddingProviders"]) >= 3
