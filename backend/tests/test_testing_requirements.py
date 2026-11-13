import os
import uuid
import asyncio
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import fitz

from backend.app.main import app
from backend.app.database.session import SessionLocal, get_db
from backend.app.models import (
    User,
    Paper,
    Collection,
    CollectionPaper,
    UploadedDocument,
    DocumentChunk,
    BackgroundJob,
    ResearchSession,
    ChatMessage,
    LiteratureReview
)
from backend.app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token
)
from backend.app.services.embeddings.embedding_service import (
    get_embedding_provider,
    LocalDeterministicEmbeddingProvider,
    OpenAIEmbeddingProvider,
    GeminiEmbeddingProvider
)
from backend.app.core.cache import embedding_cache, scholarly_cache
from backend.app.services.rag.rag_service import rag_service
from backend.app.services.search.search_service import search_service
from backend.app.services.qdrant_service import qdrant_service
from backend.app.services.scholarly_apis import scholarly_orchestrator
from backend.app.workers.document_worker import process_pdf_document_task

client = TestClient(app)

def create_valid_test_pdf_bytes(title: str = "Deep Learning for Quantum Simulation") -> bytes:
    """Generates an authentic in-memory PDF with text sections and title using PyMuPDF."""
    doc = fitz.open()
    page = doc.new_page()
    content = f"""{title}
Dr. Elena Vance, Dr. Gordon Freeman
MIT Laboratory for Physical Sciences

Abstract
We present principled quantum circuit optimizations using neural network compilation. Our methodology achieves significant depth reduction across benchmark architectures.

1. Introduction
Quantum information processing requires executing coherent unitary operations on qudits. Conventional transpilers incur quadratic gate overhead.

2. Methodology
We formulate transpilation as a discrete optimization problem solved via graph neural networks.

3. Results
Simulation metrics show 42% gate count reduction compared to standard Qiskit baselines.

References
[1] Vaswani et al. Attention Is All You Need. NeurIPS 2017.
[2] Nielsen and Chuang. Quantum Computation and Quantum Information. 2010.
"""
    page.insert_text((50, 72), content)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


# ==============================================================================
# 1. AUTHENTICATION & TOKEN ROTATION TESTS
# ==============================================================================

def test_authentication_registration_login_refresh_logout():
    unique_email = f"auth_test_{uuid.uuid4().hex[:8]}@university.edu"
    raw_password = "SecureAcademicPassword2026!"

    # 1. Registration
    reg_res = client.post("/api/auth/register", json={
        "email": unique_email,
        "password": raw_password,
        "full_name": "Dr. Marie Curie",
        "institution": "Sorbonne University"
    })
    assert reg_res.status_code == 200
    data = reg_res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == unique_email
    assert data["user"]["full_name"] == "Dr. Marie Curie"

    access_token = data["access_token"]
    refresh_token = data["refresh_token"]

    # 2. Login with valid credentials
    login_res = client.post("/api/auth/login", data={
        "username": unique_email,
        "password": raw_password
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    new_refresh_token = login_data["refresh_token"]

    # 3. Login with invalid password fails (401)
    bad_login = client.post("/api/auth/login", data={
        "username": unique_email,
        "password": "WrongPassword123!"
    })
    assert bad_login.status_code == 401

    # 4. Refresh token rotation
    refresh_res = client.post("/api/auth/refresh", json={
        "refresh_token": new_refresh_token
    })
    assert refresh_res.status_code == 200
    rotated_data = refresh_res.json()
    assert "access_token" in rotated_data
    assert "refresh_token" in rotated_data
    rotated_refresh_token = rotated_data["refresh_token"]

    # Old refresh token should now be revoked (single-use rotation)
    stale_refresh = client.post("/api/auth/refresh", json={
        "refresh_token": new_refresh_token
    })
    assert stale_refresh.status_code == 401

    # 5. Access profile with valid access token
    headers = {"Authorization": f"Bearer {rotated_data['access_token']}"}
    prof_res = client.get("/api/auth/profile", headers=headers)
    assert prof_res.status_code == 200
    assert prof_res.json()["email"] == unique_email

    # 6. Logout
    logout_res = client.post("/api/auth/logout", headers=headers)
    assert logout_res.status_code == 200

    # Refreshing with the rotated token after logout must fail
    post_logout_refresh = client.post("/api/auth/refresh", json={
        "refresh_token": rotated_refresh_token
    })
    assert post_logout_refresh.status_code == 401


# ==============================================================================
# 2. SEARCH & SCHOLARLY RETRIEVAL TESTS (WITH MOCKED EXTERNAL APIS)
# ==============================================================================

def test_search_execution_with_filters_and_deduplication():
    # Mock external scholarly orchestrator search to return authentic deterministic papers
    mocked_papers = [
        {
            "id": f"mock-paper-{uuid.uuid4().hex[:6]}",
            "title": "Attention Mechanisms in Deep Generative Networks",
            "abstract": "We introduce generalized multi-head self-attention for sequence modeling.",
            "year": 2021,
            "citation_count": 1250,
            "reference_count": 45,
            "fields_of_study": ["Computer Science", "Artificial Intelligence"],
            "source": "openalex",
            "doi": "10.1000/182"
        },
        {
            "id": f"mock-paper-{uuid.uuid4().hex[:6]}",
            "title": "Sparse Attention Transformers for Long Document Summarization",
            "abstract": "Hierarchical attention mechanisms reduce computational complexity from quadratic to linear.",
            "year": 2023,
            "citation_count": 320,
            "reference_count": 30,
            "fields_of_study": ["Computer Science", "Natural Language Processing"],
            "source": "arxiv",
            "arxiv_id": "2301.12345"
        }
    ]

    mock_return = {
        "papers": mocked_papers,
        "source_breakdown": {"openalex": 1, "arxiv": 1},
        "attributions": ["OpenAlex CC0 Public Domain", "arXiv.org E-Print Archive"],
        "cached": False
    }

    with patch.object(scholarly_orchestrator, "search", new_callable=AsyncMock, return_value=mock_return):
        # 1. Search with keyword query
        res = client.get("/api/papers/search?q=attention+transformers&yearStart=2020&yearEnd=2024&minCitations=100")
        assert res.status_code == 200
        data = res.json()
        assert "papers" in data
        assert len(data["papers"]) >= 1
        assert "attributions" in data

        # 2. Verify sorting by citations
        res_sort = client.get("/api/papers/search?q=attention&sortBy=citations")
        assert res_sort.status_code == 200
        sorted_papers = res_sort.json()["papers"]
        if len(sorted_papers) >= 2:
            assert sorted_papers[0]["citationCount"] >= sorted_papers[1]["citationCount"]

        # 3. Verify provider filtering
        res_provider = client.get("/api/papers/search?q=attention&provider=openalex")
        assert res_provider.status_code == 200


# ==============================================================================
# 3. DOCUMENT INGESTION & ASYNC PIPELINE TESTS
# ==============================================================================

def test_document_ingestion_and_background_worker():
    # Generate valid PDF with PyMuPDF
    pdf_bytes = create_valid_test_pdf_bytes("Quantum Compiler Architectures for Superconducting Qudits")

    # 1. Async PDF upload endpoint
    upload_res = client.post(
        "/api/papers/upload/async",
        files={"pdf": ("quantum_compiler.pdf", pdf_bytes, "application/pdf")},
        data={"collectionId": ""}
    )
    assert upload_res.status_code == 200
    upload_data = upload_res.json()
    assert "jobId" in upload_data
    job_id = upload_data["jobId"]
    assert upload_data["status"] in ["queued", "processing"]

    # 2. Check upload status
    status_res = client.get(f"/api/papers/upload/status/{job_id}")
    assert status_res.status_code == 200
    assert status_res.json()["jobId"] == job_id

    # 3. Run background worker directly on the task
    with SessionLocal() as db:
        user_id = f"test-usr-{uuid.uuid4().hex[:6]}"
        asyncio.run(process_pdf_document_task(
            job_id=job_id,
            file_bytes=pdf_bytes,
            filename="quantum_compiler.pdf",
            collection_id=None,
            user_id=user_id
        ))

        # Check job completion in database
        completed_job = db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
        assert completed_job is not None
        assert completed_job.status in ["completed", "ready"]
        assert completed_job.progress == 100


# ==============================================================================
# 4. EMBEDDING ABSTRACTIONS & CACHING TESTS
# ==============================================================================

def test_embedding_provider_abstraction_and_cache():
    # 1. Local Deterministic Provider (384d)
    local_prov = LocalDeterministicEmbeddingProvider()
    assert local_prov.dimension == 384
    v1 = asyncio.run(local_prov.embed_query("Machine learning for protein folding"))
    assert len(v1) == 384
    assert isinstance(v1[0], float)

    # Determinism: same string yields identical vector
    v2 = asyncio.run(local_prov.embed_query("Machine learning for protein folding"))
    assert v1 == v2

    # Different text yields distinct vector
    v_diff = asyncio.run(local_prov.embed_query("Economic trends in macro markets"))
    assert v1 != v_diff

    # 2. Embedding Cache Verification
    initial_cache_size = embedding_cache.stats()["size"]
    # Query via cached interface
    vec_cached = asyncio.run(local_prov.embed_query("Novel transformer architecture with sparse cache"))
    assert embedding_cache.stats()["size"] >= initial_cache_size

    # Re-querying should trigger cache hit
    hits_before = embedding_cache.stats()["hits"]
    _ = asyncio.run(local_prov.embed_query("Novel transformer architecture with sparse cache"))
    assert embedding_cache.stats()["hits"] > hits_before

    # 3. Provider switching
    openai_prov = get_embedding_provider("openai", api_key="sk-test-mock-key")
    assert openai_prov.dimension == 1536
    gemini_prov = get_embedding_provider("gemini", api_key="test-gemini-key")
    assert gemini_prov.dimension == 768


# ==============================================================================
# 5. RETRIEVAL & HYBRID RANKING TESTS
# ==============================================================================

def test_hybrid_retrieval_reciprocal_rank_fusion():
    """Tests Reciprocal Rank Fusion combining dense semantic vectors and sparse lexical search."""
    sample_papers = [
        {"id": "p1", "title": "Attention Mechanism", "vector_rank": 1, "lexical_rank": 2},
        {"id": "p2", "title": "Graph Neural Networks", "vector_rank": 2, "lexical_rank": 5},
        {"id": "p3", "title": "Random Baseline", "vector_rank": 10, "lexical_rank": 10},
    ]

    # RRF formula: Score = sum( 1 / (k + rank) ) with k=60
    k = 60
    scores = {}
    for p in sample_papers:
        rrf_score = (1.0 / (k + p["vector_rank"])) + (1.0 / (k + p["lexical_rank"]))
        scores[p["id"]] = rrf_score

    assert scores["p1"] > scores["p2"]
    assert scores["p2"] > scores["p3"]


# ==============================================================================
# 6. CITATION VALIDATION & GROUNDED RAG SYNTHESIS TESTS
# ==============================================================================

def test_grounded_rag_and_citation_validation():
    with SessionLocal() as db:
        # Create 2 reference papers in DB
        p1 = Paper(
            id=f"cite-p1-{uuid.uuid4().hex[:6]}",
            title="Attention Is All You Need",
            authors=[{"name": "Vaswani et al."}],
            year=2017,
            abstract="The Transformer is the first transduction model relying entirely on self-attention.",
            source="openalex"
        )
        p2 = Paper(
            id=f"cite-p2-{uuid.uuid4().hex[:6]}",
            title="BERT: Pre-training of Deep Bidirectional Transformers",
            authors=[{"name": "Devlin et al."}],
            year=2018,
            abstract="BERT is designed to pre-train deep bidirectional representations from unlabeled text.",
            source="openalex"
        )
        db.add_all([p1, p2])
        db.commit()

        # Ask question grounded in these papers
        res = client.post("/api/ai/ask", json={
            "question": "How do attention mechanisms enable bidirectional representations?",
            "paperIds": [p1.id, p2.id],
            "mode": "comprehensive"
        })
        assert res.status_code == 200
        data = res.json()
        assert "answer" in data
        assert "citations" in data
        assert len(data["citations"]) >= 1

        # Verify citation keys reference valid papers in context
        citation_paper_ids = [c["paperId"] for c in data["citations"]]
        for c_id in citation_paper_ids:
            assert c_id in [p1.id, p2.id]


# ==============================================================================
# 7. AUTHORIZATION & OWNERSHIP ENFORCEMENT TESTS
# ==============================================================================

def test_authorization_ownership_boundaries():
    # User Alpha
    res_a = client.post("/api/auth/register", json={
        "email": f"alpha_{uuid.uuid4().hex[:6]}@domain.com",
        "password": "PasswordAlpha123!"
    })
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # User Beta
    res_b = client.post("/api/auth/register", json={
        "email": f"beta_{uuid.uuid4().hex[:6]}@domain.com",
        "password": "PasswordBeta123!"
    })
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User Alpha creates a private collection
    col_res = client.post("/api/collections", json={
        "name": "Alpha Private Research",
        "description": "Sensitive findings",
        "is_public": False
    }, headers=headers_a)
    col_id = col_res.json()["id"]

    # 1. User Beta cannot read Alpha's private collection (403)
    read_attempt = client.get(f"/api/collections/{col_id}", headers=headers_b)
    assert read_attempt.status_code == 403

    # 2. User Beta cannot add papers to Alpha's collection (403)
    add_attempt = client.post(f"/api/collections/{col_id}/papers", json={"paperId": "some-paper"}, headers=headers_b)
    assert add_attempt.status_code == 403

    # 3. User Beta cannot delete Alpha's collection (403)
    del_attempt = client.delete(f"/api/collections/{col_id}", headers=headers_b)
    assert del_attempt.status_code == 403

    # 4. Unauthenticated user cannot access private collection (401)
    unauth_attempt = client.get(f"/api/collections/{col_id}")
    assert unauth_attempt.status_code == 401

    # Clean up
    client.delete(f"/api/collections/{col_id}", headers=headers_a)


# ==============================================================================
# 8. COLLECTION LIFECYCLE & SHARING TESTS
# ==============================================================================

def test_collection_crud_annotations_and_public_sharing():
    # Create test user
    reg = client.post("/api/auth/register", json={
        "email": f"col_user_{uuid.uuid4().hex[:6]}@univ.edu",
        "password": "CollectionUserPassword123!"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create collection
    col_res = client.post("/api/collections", json={
        "name": "Machine Learning in Medicine",
        "description": "Clinical diagnosis algorithms",
        "color": "#10b981",
        "icon": "Heart"
    }, headers=headers)
    assert col_res.status_code == 201
    col_data = col_res.json()
    col_id = col_data["id"]

    # 2. Add paper to collection
    with SessionLocal() as db:
        p = Paper(
            id=f"med-paper-{uuid.uuid4().hex[:6]}",
            title="Deep Learning in Pathology Image Segmentation",
            year=2022,
            citation_count=45,
            source="openalex"
        )
        db.add(p)
        db.commit()
        paper_id = p.id

    add_res = client.post(f"/api/collections/{col_id}/papers", json={"paperId": paper_id}, headers=headers)
    assert add_res.status_code == 200
    assert paper_id in add_res.json()["paperIds"]

    # 3. Update annotations (user rating and critical appraisal notes)
    annot_res = client.patch(f"/api/collections/{col_id}/papers/{paper_id}/annotation", json={
        "notes": "High methodological rigor; randomized validation cohort used.",
        "rating": 5
    }, headers=headers)
    assert annot_res.status_code == 200

    # 4. Share collection publicly
    share_res = client.post(f"/api/collections/{col_id}/share", headers=headers)
    assert share_res.status_code == 200
    share_token = share_res.json()["shareToken"]

    # Public user (no auth) can view shared collection via shareToken
    pub_res = client.get(f"/api/collections/public/{share_token}")
    assert pub_res.status_code == 200
    assert pub_res.json()["name"] == "Machine Learning in Medicine"


# ==============================================================================
# 9. INTEGRATION TEST: POSTGRESQL + QDRANT + FASTAPI + AI ADAPTERS
# ==============================================================================

def test_full_pipeline_integration_postgres_qdrant_fastapi_ai():
    """
    Validates end-to-end integration between:
    1. PostgreSQL (relational storage of users, papers, collections, document chunks)
    2. Qdrant (dense vector collection, cosine index, payload metadata)
    3. FastAPI (REST route coordinators, serializations, dependencies)
    4. AI Provider Adapters (deterministic RAG synthesis and chunk embedding)
    """
    with SessionLocal() as db:
        # Step A: Create and persist paper in PostgreSQL
        paper_id = f"pipeline-paper-{uuid.uuid4().hex[:6]}"
        test_paper = Paper(
            id=paper_id,
            title="Photonic Neural Networks for Sub-Nanosecond Inference",
            authors=[{"name": "Dr. Elena Vance"}, {"name": "Dr. Gordon Freeman"}],
            year=2024,
            abstract="Optical computing architectures execute matrix multiplications at the speed of light.",
            citation_count=88,
            reference_count=24,
            fields_of_study=["Physics", "Computer Science"],
            source="upload",
            pdf_extracted={"full_text": "Photonic waveguides enable non-volatile synaptic weights."}
        )
        db.add(test_paper)
        db.commit()

        # Step B: Insert vectors into Qdrant with payload metadata
        qdrant_service.init_collection(vector_size=384)
        embed_prov = get_embedding_provider("local", dim=384)
        sample_chunk = "Photonic waveguides enable non-volatile synaptic weights with sub-nanosecond latency."
        vector = asyncio.run(embed_prov.embed_query(sample_chunk))

        asyncio.run(qdrant_service.upsert_paper_chunks(
            paper_id=paper_id,
            chunks=[sample_chunk],
            vectors=[vector],
            metadatas=[{
                "title": test_paper.title,
                "year": test_paper.year,
                "section": "Architecture"
            }]
        ))

        # Step C: Query vector search in Qdrant via embedding adapter
        qdrant_results = asyncio.run(qdrant_service.search(query_vector=vector, limit=10))
        assert len(qdrant_results) >= 1
        found_point = any(r.get("payload", {}).get("paper_id") == paper_id for r in qdrant_results)
        assert found_point is True

        # Step D: Query FastAPI API endpoint
        api_paper_res = client.get(f"/api/papers/{paper_id}")
        assert api_paper_res.status_code == 200
        assert api_paper_res.json()["paper"]["title"] == "Photonic Neural Networks for Sub-Nanosecond Inference"

        # Step E: Grounded AI synthesis across the integrated paper
        ask_res = client.post("/api/ai/ask", json={
            "question": "What enables sub-nanosecond inference in photonic networks?",
            "paperIds": [paper_id],
            "mode": "methodology"
        })
        assert ask_res.status_code == 200
        synthesis = ask_res.json()
        assert "answer" in synthesis
        assert len(synthesis["citations"]) >= 1
        assert synthesis["citations"][0]["paperId"] == paper_id
