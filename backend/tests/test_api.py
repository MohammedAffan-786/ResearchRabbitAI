import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["database"] == "connected"
    assert data["vector_store"] == "qdrant_connected"

def test_auth_flow():
    email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
    # Register
    reg_resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "SecurePassword123!",
        "full_name": "Test Academic",
        "institution": "University of Science"
    })
    assert reg_resp.status_code == 200
    token = reg_resp.json()["access_token"]
    assert token is not None

    # Login
    login_resp = client.post("/api/auth/login", data={
        "username": email,
        "password": "SecurePassword123!"
    })
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()

def test_search_papers():
    response = client.get("/api/papers/search?q=transformer")
    assert response.status_code == 200
    data = response.json()
    assert "papers" in data
    assert data["totalResults"] >= 1

def test_collections_crud():
    # Create collection
    create_resp = client.post("/api/collections", json={
        "name": "Test Neural Architectures",
        "description": "Collection created for unit testing",
        "color": "#10b981",
        "icon": "Cpu"
    })
    assert create_resp.status_code == 201
    col_id = create_resp.json()["id"]

    # List collections
    list_resp = client.get("/api/collections")
    assert list_resp.status_code == 200
    assert any(c["id"] == col_id for c in list_resp.json())

    # Add paper to collection
    add_resp = client.post(f"/api/collections/{col_id}/papers", json={"paperId": "paper-vaswani-2017"})
    assert add_resp.status_code == 200
    assert "paper-vaswani-2017" in add_resp.json()["paperIds"]

def test_knowledge_graph():
    response = client.get("/api/graph?seeds=paper-vaswani-2017")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "links" in data
    assert len(data["nodes"]) > 0

def test_ai_rag_ask():
    response = client.post("/api/ai/ask", json={
        "question": "What is self-attention and how does it improve parallelization?",
        "paperIds": ["paper-vaswani-2017"],
        "mode": "comprehensive"
    })
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "citations" in data
    assert len(data["citations"]) > 0

def test_analytics_overview():
    response = client.get("/api/analytics/overview")
    assert response.status_code == 200
    data = response.json()
    assert "citationsByYear" in data
    assert "fieldsDistribution" in data
    assert "totalPapers" in data
    assert data["totalPapers"] > 0
