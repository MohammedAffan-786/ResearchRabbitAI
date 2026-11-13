import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_refresh_token_and_profile():
    # 1. Register new user
    import uuid
    email = f"researcher_{uuid.uuid4().hex[:6]}@oxford.ac.uk"
    reg_res = client.post("/api/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": "Dr. Sarah Connor",
        "institution": "University of Oxford"
    })
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert "refresh_token" in reg_data
    access_token = reg_data["access_token"]
    refresh_token = reg_data["refresh_token"]

    # 2. Get profile
    headers = {"Authorization": f"Bearer {access_token}"}
    prof_res = client.get("/api/auth/profile", headers=headers)
    assert prof_res.status_code == 200
    prof_data = prof_res.json()
    assert prof_data["email"] == email
    assert prof_data["full_name"] == "Dr. Sarah Connor"
    assert "stats" in prof_data

    # 3. Update profile
    upd_res = client.put("/api/auth/profile", json={"institution": "Oxford Robotics Institute"}, headers=headers)
    assert upd_res.status_code == 200
    assert upd_res.json()["institution"] == "Oxford Robotics Institute"

    # 4. Refresh token
    ref_res = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert ref_res.status_code == 200
    ref_data = ref_res.json()
    assert "access_token" in ref_data
    assert "refresh_token" in ref_data

    # 5. Logout
    new_headers = {"Authorization": f"Bearer {ref_data['access_token']}"}
    logout_res = client.post("/api/auth/logout", headers=new_headers)
    assert logout_res.status_code == 200

def test_dashboard_overview_and_activity():
    # Test dashboard overview
    dash_res = client.get("/api/dashboard/overview")
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert "stats" in dash_data
    assert "totalPapers" in dash_data["stats"]
    assert "recentActivities" in dash_data
    assert "trendingTopics" in dash_data
    assert "recommendations" in dash_data

    # Test logging activity
    act_res = client.post("/api/dashboard/activity", json={
        "activity_type": "search",
        "title": "Natural language query on graph neural networks",
        "metadata_json": {"query": "graph neural networks"}
    })
    assert act_res.status_code == 200
    assert act_res.json()["status"] == "logged"

def test_paper_intelligence():
    # Fetch a paper to analyze
    papers_res = client.get("/api/papers")
    assert papers_res.status_code == 200
    papers = papers_res.json()["papers"]
    assert len(papers) > 0
    paper_id = papers[0]["id"]

    # Request intelligence
    intel_res = client.get(f"/api/papers/{paper_id}/intelligence")
    assert intel_res.status_code == 200
    intel_data = intel_res.json()
    assert "intelligence" in intel_data
    intel = intel_data["intelligence"]
    assert "problemStatement" in intel
    assert "methodology" in intel
    assert "keyFindings" in intel
    assert "limitations" in intel
    assert "futureDirections" in intel
    assert "isAbstractOnly" in intel

def test_collections_advanced():
    # 1. Create collection
    col_res = client.post("/api/collections", json={
        "name": "Transformer Models",
        "description": "Foundational attention and transformer architectures",
        "color": "#8b5cf6",
        "icon": "Cpu",
        "tags": ["AI", "Transformers"]
    })
    assert col_res.status_code == 201
    col = col_res.json()
    col_id = col["id"]

    # 2. Add paper to collection
    papers = client.get("/api/papers").json()["papers"]
    if papers:
        client.post(f"/api/collections/{col_id}/papers", json={"paperId": papers[0]["id"]})

    # 3. Search within collection
    search_col_res = client.get(f"/api/collections/{col_id}/search?q=attention")
    assert search_col_res.status_code == 200
    assert "results" in search_col_res.json()

    # 4. Toggle share
    share_res = client.post(f"/api/collections/{col_id}/share")
    assert share_res.status_code == 200
    share_data = share_res.json()
    assert share_data["isPublic"] is True
    share_token = share_data["shareToken"]

    # 5. Access public collection
    pub_res = client.get(f"/api/collections/public/{share_token}")
    assert pub_res.status_code == 200
    assert pub_res.json()["name"] == "Transformer Models"

    # 6. Summarize collection
    sum_res = client.post(f"/api/collections/{col_id}/summarize")
    assert sum_res.status_code == 200
    assert "summary" in sum_res.json()

def test_export_styles():
    papers = client.get("/api/papers").json()["papers"]
    pids = [p["id"] for p in papers[:2]]

    # BibTeX
    bib_res = client.post("/api/export", json={"paperIds": pids, "format": "bibtex"})
    assert bib_res.status_code == 200
    assert "@article" in bib_res.text

    # RIS
    ris_res = client.post("/api/export", json={"paperIds": pids, "format": "ris"})
    assert ris_res.status_code == 200
    assert "TY  - JOUR" in ris_res.text

    # Chicago
    chi_res = client.post("/api/export", json={"paperIds": pids, "format": "text", "style": "chicago"})
    assert chi_res.status_code == 200
    assert len(chi_res.json()["citations"]) > 0
