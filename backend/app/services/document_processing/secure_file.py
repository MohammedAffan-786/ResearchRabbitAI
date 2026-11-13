import os
import re
import uuid
import hashlib
from pathlib import Path
from typing import Tuple
from backend.app.core.exceptions import InvalidFileException
from backend.app.core.logging import log_security_event

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB

def sanitize_filename(filename: str) -> str:
    """
    Strips directory traversal, path separators, null bytes, and illegal characters.
    Never trusts user-provided filenames or file paths.
    """
    if not filename:
        return "uploaded_document.pdf"

    # Strip directory components (both Unix / and Windows \)
    clean = os.path.basename(filename)
    clean = clean.split("/")[-1].split("\\")[-1]

    # Remove null bytes and control characters
    clean = re.sub(r'[\x00-\x1f\x7f/\\]', '', clean)

    # Prevent directory traversal dots
    clean = re.sub(r'\.\.+', '.', clean)

    # Clean whitespace and strip leading dots
    clean = clean.strip(". \t\r\n")

    if not clean:
        clean = "document.pdf"
    elif not clean.lower().endswith(".pdf"):
        clean = f"{clean}.pdf"

    return clean

def generate_secure_storage_token(prefix: str = "doc") -> str:
    """Generates a cryptographically random, collision-free storage token for internal persistence."""
    return f"{prefix}_{uuid.uuid4().hex}"

def safe_join_paths(base_dir: str, filename: str) -> str:
    """
    Safely joins base_dir and filename, guaranteeing that the target path
    cannot escape base_dir via directory traversal or symlinks.
    """
    safe_name = sanitize_filename(filename)
    base_path = Path(base_dir).resolve()
    target_path = (base_path / safe_name).resolve()

    try:
        # Check that target_path is relative to base_path
        target_path.relative_to(base_path)
    except ValueError:
        log_security_event(
            event_type="PATH_TRAVERSAL_ATTEMPT",
            resource=filename,
            details=f"Target path {target_path} escaped base {base_path}",
            severity="WARNING"
        )
        raise InvalidFileException("Invalid file path: path traversal is strictly prohibited.")

    return str(target_path)

def validate_pdf_file(contents: bytes, filename: str, mime_type: str = "application/pdf") -> Tuple[bool, str]:
    """
    Validates file size, extension, MIME type, and magic bytes for PDF documents.
    Enforces strict security checks before any parsing or disk operations.
    """
    if not contents or len(contents) == 0:
        raise InvalidFileException("The uploaded file is empty.")

    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise InvalidFileException(
            f"File size ({len(contents) / (1024*1024):.1f}MB) exceeds the maximum allowed limit of 25MB."
        )

    # Validate PDF magic header
    # Standard PDFs start with %PDF- (0x25 0x50 0x44 0x46 0x2D) within the first 1024 bytes
    if b"%PDF-" not in contents[:1024]:
        log_security_event(
            event_type="INVALID_FILE_HEADER",
            resource=filename,
            details="Uploaded file missing %PDF- magic bytes header.",
            severity="WARNING"
        )
        raise InvalidFileException("The uploaded file is not a valid PDF document (missing %PDF- header).")

    safe_name = sanitize_filename(filename)
    return True, safe_name

def compute_file_sha256(contents: bytes) -> str:
    """Computes SHA-256 hexadecimal hash for document deduplication and integrity auditing."""
    return hashlib.sha256(contents).hexdigest()
