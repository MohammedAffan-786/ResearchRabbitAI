import uuid
import hashlib
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import app
from backend.app.db.database import get_db, SessionLocal, engine
from backend.app.db.models import (
    User,
    RefreshToken,
    Paper,
    Author,
    PaperAuthor,
    Citation,
    ResearchTopic,
    PaperTopic,
    Collection,
    CollectionPaper,
    UploadedDocument,
    DocumentChunk,
    ResearchSession,
    ChatMessage,
    LiteratureReview,
    UserActivity,
    BackgroundJob
)
from backend.app.services.paper_deduplication import (
    deduplication_service,
    normalize_title,
    normalize_doi,
    normalize_arxiv_id,
    compute_file_sha256
)
from backend.app.services.qdrant_sync_service import qdrant_sync_service

client = TestClient(app)

def test_normalized_models_creation_and_query():
    """Verify that all 17 normalized models can be created, persisted, and queried."""
    with SessionLocal() as db:
        unique_suffix = uuid.uuid4().hex[:8]

        # 1. User
        user = User(
            email=f"scholar_{unique_suffix}@mit.edu",
            hashed_password="fakehashedsecret",
            full_name=f"Prof. Test Scholar {unique_suffix}",
            institution="MIT AI Lab"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        assert user.id is not None

        # 2. RefreshToken
        token_hash = hashlib.sha256(f"secret_token_{unique_suffix}".encode("utf-8")).hexdigest()
        rt = RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            is_revoked=False
        )
        db.add(rt)
        db.commit()
        assert rt.id is not None

        # 3. Paper
        paper = Paper(
            id=f"paper-test-{unique_suffix}",
            title=f"Scalable Self-Attention in Transformer Models {unique_suffix}",
            title_normalized=normalize_title(f"Scalable Self-Attention in Transformer Models {unique_suffix}"),
            year=2024,
            venue="NeurIPS",
            doi=f"10.1145/test.{unique_suffix}",
            arxiv_id=f"2401.{unique_suffix[:5]}",
            citation_count=42,
            uploader_id=user.id
        )
        db.add(paper)

        # 4. Author
        author = Author(
            id=f"auth-{unique_suffix}",
            name=f"Dr. Alan Turing {unique_suffix}",
            normalized_name=normalize_title(f"Dr. Alan Turing {unique_suffix}"),
            affiliation="Cambridge University",
            orcid=f"0000-0002-{unique_suffix[:4]}-9999"
        )
        db.add(author)
        db.commit()

        # 5. PaperAuthor
        pa = PaperAuthor(
            paper_id=paper.id,
            author_id=author.id,
            author_order=1,
            is_corresponding=True
        )
        db.add(pa)

        # 6. Citation (paper cites existing seminal paper)
        citation = Citation(
            citing_paper_id=paper.id,
            cited_paper_id="paper-vaswani-2017",
            citation_context="Building upon seminal multi-head attention foundations.",
            is_influential=True
        )
        db.add(citation)

        # 7. ResearchTopic
        topic = ResearchTopic(
            id=f"topic-{unique_suffix}",
            name=f"Transformers and Attention {unique_suffix}",
            slug=f"transformers-attention-{unique_suffix}",
            category="Machine Learning"
        )
        db.add(topic)
        db.commit()

        # 8. PaperTopic
        pt = PaperTopic(
            paper_id=paper.id,
            topic_id=topic.id,
            confidence_score=0.98
        )
        db.add(pt)

        # 9. Collection
        col = Collection(
            owner_id=user.id,
            name=f"Attention Systems {unique_suffix}",
            description="Normalized test collection",
            color="#4f46e5"
        )
        db.add(col)
        db.commit()
        db.refresh(col)

        # 10. CollectionPaper
        cp = CollectionPaper(
            collection_id=col.id,
            paper_id=paper.id,
            notes="Crucial foundational paper for multi-query attention.",
            user_rating=5
        )
        db.add(cp)

        # 11. UploadedDocument
        doc_bytes = f"Research document content {unique_suffix}".encode("utf-8")
        file_sha256 = compute_file_sha256(doc_bytes)
        doc = UploadedDocument(
            user_id=user.id,
            paper_id=paper.id,
            filename=f"paper_{unique_suffix}.pdf",
            file_size_bytes=len(doc_bytes),
            file_hash=file_sha256,
            page_count=12,
            processing_status="completed"
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        # 12. DocumentChunk
        chunk = DocumentChunk(
            document_id=doc.id,
            paper_id=paper.id,
            chunk_index=0,
            page_number=1,
            section_heading="Introduction",
            content="Recent advances in neural architecture optimization have enabled efficient scaling.",
            qdrant_point_id=f"qpoint-{unique_suffix}",
            qdrant_synced_at=datetime.now(timezone.utc)
        )
        db.add(chunk)

        # 13. ResearchSession
        session = ResearchSession(
            user_id=user.id,
            title=f"Inquiry on {paper.title[:40]}",
            mode="comprehensive",
            paper_ids=[paper.id]
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        # 14. ChatMessage
        msg_user = ChatMessage(
            session_id=session.id,
            role="user",
            content="What are the key architectural improvements?"
        )
        msg_bot = ChatMessage(
            session_id=session.id,
            role="assistant",
            content="The authors propose linear attention complexity.",
            citations_payload=[{"paperId": paper.id, "citeKey": "Test2024", "confidence": 0.95}]
        )
        db.add_all([msg_user, msg_bot])

        # 15. LiteratureReview
        review = LiteratureReview(
            user_id=user.id,
            collection_id=col.id,
            title=f"Systematic Review of Attention Mechanisms {unique_suffix}",
            topic="Attention Mechanisms",
            paper_ids=[paper.id],
            executive_summary="Comprehensive analysis of transformer attention complexity.",
            sections=[{"heading": "Architectures", "content": "Comparative synthesis."}]
        )
        db.add(review)

        # 16. UserActivity
        activity = UserActivity(
            user_id=user.id,
            activity_type="synthesize_review",
            entity_type="literature_review",
            entity_id=review.id,
            title=f"Synthesized review on Attention Mechanisms",
            metadata_json={"paperCount": 1}
        )
        db.add(activity)

        # 17. BackgroundJob
        job = BackgroundJob(
            user_id=user.id,
            job_type="pdf_ingestion",
            filename=f"paper_{unique_suffix}.pdf",
            status="completed",
            progress=100,
            stage="Completed",
            paper_id=paper.id
        )
        db.add(job)
        db.commit()

        # Verify all 17 models are present in DB
        assert db.query(User).filter(User.id == user.id).count() == 1
        assert db.query(RefreshToken).filter(RefreshToken.id == rt.id).count() == 1
        assert db.query(Paper).filter(Paper.id == paper.id).count() == 1
        assert db.query(Author).filter(Author.id == author.id).count() == 1
        assert db.query(PaperAuthor).filter(PaperAuthor.paper_id == paper.id).count() == 1
        assert db.query(Citation).filter(Citation.citing_paper_id == paper.id).count() == 1
        assert db.query(ResearchTopic).filter(ResearchTopic.id == topic.id).count() == 1
        assert db.query(PaperTopic).filter(PaperTopic.paper_id == paper.id).count() == 1
        assert db.query(Collection).filter(Collection.id == col.id).count() == 1
        assert db.query(CollectionPaper).filter(CollectionPaper.collection_id == col.id).count() == 1
        assert db.query(UploadedDocument).filter(UploadedDocument.id == doc.id).count() == 1
        assert db.query(DocumentChunk).filter(DocumentChunk.id == chunk.id).count() == 1
        assert db.query(ResearchSession).filter(ResearchSession.id == session.id).count() == 1
        assert db.query(ChatMessage).filter(ChatMessage.session_id == session.id).count() == 2
        assert db.query(LiteratureReview).filter(LiteratureReview.id == review.id).count() == 1
        assert db.query(UserActivity).filter(UserActivity.id == activity.id).count() == 1
        assert db.query(BackgroundJob).filter(BackgroundJob.id == job.id).count() == 1

        # Clean up created test entities
        db.delete(user)
        db.delete(paper)
        db.delete(author)
        db.delete(topic)
        db.commit()

def test_deduplication_service_multi_tier():
    """Verify paper deduplication by DOI, arXiv ID, normalized title+year, and SHA-256."""
    with SessionLocal() as db:
        suffix = uuid.uuid4().hex[:6]
        raw_doi = f"https://doi.org/10.1145/DEDUP.{suffix}"
        normalized_expected_doi = f"10.1145/dedup.{suffix}"

        # 1. Normalization functions
        assert normalize_doi(raw_doi) == normalized_expected_doi
        assert normalize_arxiv_id("arXiv:2401.12345v2") == "2401.12345"
        assert normalize_title("  Attention Is All You Need!  ") == "attention is all you need"

        # 2. Insert initial paper
        p1, is_new1 = deduplication_service.get_or_create_paper(db, {
            "title": f"Deduplication Test Paper {suffix}",
            "authors": [{"name": "Jane Researcher"}],
            "year": 2024,
            "venue": "ICLR",
            "doi": raw_doi,
            "arxiv_id": f"2401.99{suffix[:3]}v1",
            "citation_count": 10
        })
        assert is_new1 is True

        # 3. Deduplication via DOI (even with prefix variance and uppercase)
        p2, is_new2 = deduplication_service.get_or_create_paper(db, {
            "title": f"A Completely Different Working Title {suffix}",
            "authors": [{"name": "Jane Researcher"}],
            "year": 2024,
            "doi": f"doi:{normalized_expected_doi.upper()}",
            "citation_count": 15
        })
        assert is_new2 is False
        assert p2.id == p1.id
        # Check citation count updated to higher value
        assert p2.citation_count == 15

        # 4. Deduplication via arXiv ID (version suffix variance)
        p3, is_new3 = deduplication_service.get_or_create_paper(db, {
            "title": f"Another Working Title {suffix}",
            "year": 2024,
            "arxiv_id": f"arXiv:2401.99{suffix[:3]}v2"
        })
        assert is_new3 is False
        assert p3.id == p1.id

        # 5. Deduplication via normalized title + year
        p4, is_new4 = deduplication_service.get_or_create_paper(db, {
            "title": f"  deduplication test paper {suffix}!!!  ",
            "year": 2024
        })
        assert is_new4 is False
        assert p4.id == p1.id

        # Clean up
        db.delete(p1)
        db.commit()

def test_qdrant_sync_and_vector_status_endpoint():
    """Verify Qdrant vector sync service audits chunks and handles status report."""
    with SessionLocal() as db:
        # Check vector sync status endpoint
        resp = client.get("/api/papers/vector-sync/status")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_chunks_in_postgres" in data
        assert "is_synchronized" in data

        # Check vector reconcile endpoint
        rec_resp = client.post("/api/papers/vector-sync/reconcile")
        assert rec_resp.status_code == 200
        rec_data = rec_resp.json()
        assert "details" in rec_data
        assert "repaired_count" in rec_data["details"]

def test_research_sessions_and_messages_api():
    """Verify research session creation, chat message logging, and citations payload."""
    # 1. Ask a question via AI RAG
    ask_resp = client.post("/api/ai/ask", json={
        "question": "Explain the multi-head attention mechanism and its benefits.",
        "paperIds": ["paper-vaswani-2017"],
        "mode": "comprehensive"
    })
    assert ask_resp.status_code == 200
    ask_data = ask_resp.json()
    assert "answer" in ask_data
    assert "sessionId" in ask_data
    session_id = ask_data["sessionId"]

    # 2. Get session messages
    msg_resp = client.get(f"/api/ai/sessions/{session_id}/messages")
    assert msg_resp.status_code == 200
    session_info = msg_resp.json()
    assert session_info["session"]["id"] == session_id
    messages = session_info["messages"]
    assert len(messages) == 2
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"
    assert len(messages[1]["citations"]) > 0

    # 3. List sessions
    list_resp = client.get("/api/ai/sessions")
    assert list_resp.status_code == 200
    sessions = list_resp.json()
    assert any(s["id"] == session_id for s in sessions)

    # 4. Clean up session
    del_resp = client.delete(f"/api/ai/sessions/{session_id}")
    assert del_resp.status_code == 200

def test_collection_paper_annotations():
    """Verify personal notes and ratings on collection papers using CollectionPaper model."""
    # 1. Create collection
    col_resp = client.post("/api/collections", json={
        "name": "Annotation Test Collection",
        "description": "Testing user ratings and notes",
        "color": "#ec4899"
    })
    assert col_resp.status_code == 201
    col_id = col_resp.json()["id"]

    # 2. Add paper
    add_resp = client.post(f"/api/collections/{col_id}/papers", json={"paperId": "paper-vaswani-2017"})
    assert add_resp.status_code == 200

    # 3. Update personal annotation
    annot_resp = client.patch(
        f"/api/collections/{col_id}/papers/paper-vaswani-2017/annotation",
        json={"notes": "Must read section 3.2 on Scaled Dot-Product Attention.", "rating": 5}
    )
    assert annot_resp.status_code == 200
    annot_data = annot_resp.json()
    assert annot_data["notes"] == "Must read section 3.2 on Scaled Dot-Product Attention."
    assert annot_data["userRating"] == 5

    # 4. Fetch collection and verify annotation is serialized
    get_col_resp = client.get(f"/api/collections/{col_id}")
    assert get_col_resp.status_code == 200
    papers = get_col_resp.json()["papers"]
    target_paper = next((p for p in papers if p["id"] == "paper-vaswani-2017"), None)
    assert target_paper is not None
    assert target_paper["notes"] == "Must read section 3.2 on Scaled Dot-Product Attention."
    assert target_paper["userRating"] == 5

    # Clean up
    client.delete(f"/api/collections/{col_id}")
