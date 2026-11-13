import io
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.exceptions import EntityNotFoundException, RateLimitExceededException, InvalidFileException
from backend.app.core.rate_limiter import InMemoryRateLimiter
from backend.app.services.document_processing.secure_file import validate_pdf_file, sanitize_filename, compute_file_sha256
from backend.app.schemas.common import PaginationParams, PaginatedResponse

client = TestClient(app)

def test_secure_file_validation():
    """Verify secure file handling rejects path traversal, non-PDF magic headers, and validates genuine PDFs."""
    # 1. Path traversal sanitization
    assert sanitize_filename("../../../etc/passwd.pdf") == "passwd.pdf"
    assert sanitize_filename("..\\..\\windows\\system32.pdf") == "system32.pdf"
    assert sanitize_filename("safe_research_paper.pdf") == "safe_research_paper.pdf"

    # 2. Rejection of fake PDF (no %PDF header)
    fake_content = b"This is plain text pretending to be a PDF"
    with pytest.raises(InvalidFileException):
        validate_pdf_file(fake_content, "fake.pdf")

    # 3. Acceptance of genuine PDF header
    valid_pdf_content = b"%PDF-1.5\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n"
    is_valid, clean_name = validate_pdf_file(valid_pdf_content, "valid.pdf")
    assert is_valid is True
    assert clean_name == "valid.pdf"

    # 4. SHA-256 hash calculation
    sha = compute_file_sha256(valid_pdf_content)
    assert len(sha) == 64

def test_pagination_params_and_response():
    """Verify generic pagination utility produces correct total pages and slicing offsets."""
    params = PaginationParams(page=2, page_size=10)
    assert params.offset == 10

    items = ["paper1", "paper2", "paper3"]
    paginated = PaginatedResponse.create(items=items, total=25, params=params)
    assert paginated.total == 25
    assert paginated.page == 2
    assert paginated.page_size == 10
    assert paginated.total_pages == 3

def test_rate_limiter_logic():
    """Verify in-memory sliding-window rate limiter blocks bursts exceeding limit."""
    limiter = InMemoryRateLimiter(requests_per_minute=3)
    key = "test-client-ip"

    allowed1, _ = limiter.is_allowed(key)
    allowed2, _ = limiter.is_allowed(key)
    allowed3, _ = limiter.is_allowed(key)
    assert allowed1 is True
    assert allowed2 is True
    assert allowed3 is True

    # 4th request must be rejected
    allowed4, retry_after = limiter.is_allowed(key)
    assert allowed4 is False
    assert retry_after > 0

def test_consistent_error_response_format():
    """Verify global exception handler formats 404, 422, and domain errors into consistent error payload."""
    # 1. 404 Not Found error
    res_404 = client.get("/api/papers/non-existent-paper-id-99999")
    assert res_404.status_code == 404
    data_404 = res_404.json()
    assert "error" in data_404
    assert data_404["error"]["code"] == "HTTP_404"
    assert "detail" in data_404

    # 2. 422 Validation error on invalid payload
    res_422 = client.post("/api/auth/register", json={"email": "not-an-email", "password": "123"})
    assert res_422.status_code == 422
    data_422 = res_422.json()
    assert "error" in data_422
    assert data_422["error"]["code"] == "VALIDATION_ERROR"

def test_modular_routes_availability():
    """Verify all 10+ modular routes are active under /api."""
    # Auth & Users
    assert client.post("/api/auth/login", data={"username": "fake", "password": "bad"}).status_code in [400, 401]
    
    # Search
    search_res = client.get("/api/papers/search?q=attention")
    assert search_res.status_code == 200
    assert "papers" in search_res.json()

    # Papers
    papers_res = client.get("/api/papers")
    assert papers_res.status_code == 200
    assert "papers" in papers_res.json()

    # Collections
    col_res = client.get("/api/collections")
    assert col_res.status_code == 200

    # Knowledge Graph
    graph_res = client.get("/api/graph")
    assert graph_res.status_code == 200

    # AI Assistant
    ask_res = client.post("/api/ai/ask", json={"question": "What is deep learning?", "paperIds": []})
    assert ask_res.status_code == 200

    # Literature Reviews & PRISMA
    prisma_res = client.get("/api/prisma")
    assert prisma_res.status_code == 200

    # Analytics
    analytics_res = client.get("/api/analytics/overview")
    assert analytics_res.status_code == 200

    # Dashboard
    dash_res = client.get("/api/dashboard/overview")
    assert dash_res.status_code == 200

def test_secure_file_upload_rejection():
    """Verify that uploading a corrupt or non-PDF file returns a secure validation error."""
    fake_pdf = io.BytesIO(b"Hello world, I am an executable masquerading as a PDF.")
    res = client.post(
        "/api/papers/upload",
        files={"pdf": ("malicious.exe.pdf", fake_pdf, "application/pdf")}
    )
    assert res.status_code in [400, 422]
    assert "PDF" in res.text or "header" in res.text
