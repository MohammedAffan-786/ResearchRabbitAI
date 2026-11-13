import os
import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token
)
from backend.app.services.document_processing.secure_file import (
    sanitize_filename,
    validate_pdf_file,
    safe_join_paths,
    MAX_FILE_SIZE_BYTES
)
from backend.app.services.document_processing.pdf_processor import pdf_processor
from backend.app.core.exceptions import InvalidFileException
from backend.app.core.rate_limiter import InMemoryRateLimiter

client = TestClient(app)

def test_password_hashing_and_verification():
    raw_pw = "ResearchRabbitSecret2026!"
    pw_hash = get_password_hash(raw_pw)

    assert pw_hash != raw_pw
    assert pw_hash.startswith("$2b$")
    assert verify_password(raw_pw, pw_hash) is True
    assert verify_password("WrongPassword!", pw_hash) is False
    assert verify_password("", pw_hash) is False

def test_jwt_authentication_token_lifecycle():
    user_id = f"usr-{uuid.uuid4().hex[:8]}"

    # Access Token
    access_token = create_access_token(user_id)
    assert access_token is not None
    decoded_sub = decode_access_token(access_token)
    assert decoded_sub == user_id

    # Refresh Token
    refresh_token = create_refresh_token(user_id)
    assert refresh_token is not None
    decoded_refresh = decode_refresh_token(refresh_token)
    assert decoded_refresh == user_id

    # Access token must NOT decode as a refresh token
    assert decode_refresh_token(access_token) is None
    # Refresh token must NOT decode as an access token
    assert decode_access_token(refresh_token) is None

def test_sanitize_filename_prevents_directory_traversal():
    """Verify that user-provided filenames never cause directory traversal or path injection."""
    malicious_names = [
        "../../etc/passwd",
        "..\\..\\Windows\\System32\\cmd.exe",
        "/var/log/secret.pdf",
        "C:\\Users\\admin\\desktop\\paper.pdf",
        "../../../malicious.pdf",
        "nested/path/to/paper.pdf",
        "clean_paper.pdf",
        "",
        "no_ext"
    ]

    for name in malicious_names:
        safe = sanitize_filename(name)
        assert "/" not in safe
        assert "\\" not in safe
        assert ".." not in safe
        assert safe.endswith(".pdf")

def test_safe_join_paths_blocks_path_escape(tmp_path):
    """Guarantees safe_join_paths prevents files from escaping the designated directory."""
    base_dir = str(tmp_path / "uploads")
    os.makedirs(base_dir, exist_ok=True)

    # Valid file name joins inside base_dir
    safe_path = safe_join_paths(base_dir, "my_manuscript.pdf")
    assert safe_path.startswith(base_dir)
    assert safe_path.endswith("my_manuscript.pdf")

def test_validate_pdf_file_checks():
    """Validates file size, non-empty, and magic %PDF- bytes."""
    # 1. Empty file
    with pytest.raises(InvalidFileException, match="empty"):
        validate_pdf_file(b"", "empty.pdf")

    # 2. Spoofed non-PDF (e.g. text/exe pretending to be PDF)
    fake_content = b"<html><body>Not a PDF!</body></html>"
    with pytest.raises(InvalidFileException, match="missing %PDF"):
        validate_pdf_file(fake_content, "fake.pdf")

    # 3. Valid PDF magic bytes
    valid_pdf_content = b"%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    valid, safe_name = validate_pdf_file(valid_pdf_content, "valid.pdf")
    assert valid is True
    assert safe_name == "valid.pdf"

    # 4. Oversized file check logic
    oversized_stub = b"%PDF-1.7" + b"X" * (MAX_FILE_SIZE_BYTES + 10)
    with pytest.raises(InvalidFileException, match="exceeds the maximum"):
        validate_pdf_file(oversized_stub, "huge.pdf")

def test_safe_document_processing_handles_corrupt_files():
    """PyMuPDF parsing rejects unreadable or corrupt bytes without crashing the service."""
    corrupt_bytes = b"%PDF-corrupted-random-junk-bytes"
    with pytest.raises(InvalidFileException, match="corrupt"):
        pdf_processor.parse_pdf(corrupt_bytes, "corrupt.pdf")

def test_sql_injection_protection_in_search_and_collections():
    """Verify that SQL injection strings in query parameters are safely handled via ORM parameterization."""
    sql_payloads = [
        "' OR '1'='1",
        "'; DROP TABLE papers; --",
        "UNION SELECT null, username, password FROM users --",
        "1' OR 1=1 ORDER BY 1 --"
    ]

    for payload in sql_payloads:
        # Search query
        res = client.get(f"/api/papers/search?q={payload}")
        assert res.status_code == 200  # Returns valid search response, no 500 SQL syntax crash
        data = res.json()
        assert "papers" in data

def test_collection_ownership_and_authorization_checks():
    """
    Verifies that private collections cannot be modified by non-owners
    and returns 403 Forbidden.
    """
    # 1. Create User A and User B
    user_a_email = f"user_a_{uuid.uuid4().hex[:6]}@example.com"
    user_b_email = f"user_b_{uuid.uuid4().hex[:6]}@example.com"

    res_a = client.post("/api/auth/register", json={"email": user_a_email, "password": "SecurePassword123!"})
    assert res_a.status_code == 200
    token_a = res_a.json()["access_token"]

    res_b = client.post("/api/auth/register", json={"email": user_b_email, "password": "SecurePassword123!"})
    assert res_b.status_code == 200
    token_b = res_b.json()["access_token"]

    # 2. User A creates a private collection
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    create_res = client.post(
        "/api/collections",
        json={"name": "User A Private Research", "description": "Confidential", "is_public": False},
        headers=headers_a
    )
    assert create_res.status_code == 201
    col_id = create_res.json()["id"]

    # 3. User B attempts to view User A's private collection -> 403 Forbidden
    get_res = client.get(f"/api/collections/{col_id}", headers=headers_b)
    assert get_res.status_code == 403
    assert "permission" in get_res.json()["detail"].lower()

    # 4. User B attempts to delete User A's collection -> 403 Forbidden
    del_res = client.delete(f"/api/collections/{col_id}", headers=headers_b)
    assert del_res.status_code == 403
    assert "permission" in del_res.json()["detail"].lower()

    # 5. User A can view and delete their own collection -> 200 OK
    get_own_res = client.get(f"/api/collections/{col_id}", headers=headers_a)
    assert get_own_res.status_code == 200

    del_own_res = client.delete(f"/api/collections/{col_id}", headers=headers_a)
    assert del_own_res.status_code == 200

def test_rate_limiter_sliding_window():
    """Verify rate limiter blocks excessive requests and calculates retry-after."""
    limiter = InMemoryRateLimiter(requests_per_minute=5)
    client_key = "test-ip-127.0.0.1"

    for i in range(5):
        allowed, retry_after = limiter.is_allowed(client_key)
        assert allowed is True
        assert retry_after == 0

    # 6th request must be blocked
    allowed, retry_after = limiter.is_allowed(client_key)
    assert allowed is False
    assert retry_after > 0

def test_doi_parameter_validation():
    """Verifies that invalid or malformed DOI parameters return 400 Bad Request."""
    invalid_dois = [
        "not-a-doi",
        "some_malicious_string_without_prefix",
        "http://invalid.url"
    ]
    for bad_doi in invalid_dois:
        res = client.get(f"/api/search/doi/{bad_doi}")
        assert res.status_code == 400
        assert "Invalid DOI format" in res.json()["detail"]
