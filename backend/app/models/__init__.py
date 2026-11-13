import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    Text,
    JSON,
    ForeignKey,
    UniqueConstraint,
    Index
)
from sqlalchemy.orm import relationship
from backend.app.database.base import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

# ==============================================================================
# 1. USERS & AUTHENTICATION
# ==============================================================================

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    institution = Column(String(255), nullable=True)
    refresh_token = Column(String(512), nullable=True)  # Legacy compatibility column
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    collections = relationship("Collection", back_populates="owner", cascade="all, delete-orphan")
    uploaded_documents = relationship("UploadedDocument", back_populates="user")
    reviews = relationship("LiteratureReview", back_populates="user", cascade="all, delete-orphan")
    prisma_projects = relationship("PrismaProject", back_populates="user", cascade="all, delete-orphan")
    activities = relationship("UserActivity", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("ResearchSession", back_populates="user", cascade="all, delete-orphan")
    background_jobs = relationship("BackgroundJob", back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    is_revoked = Column(Boolean, default=False, nullable=False, index=True)
    revoked_at = Column(DateTime, nullable=True)
    replaced_by_token = Column(String(255), nullable=True)
    user_agent = Column(String(512), nullable=True)
    ip_address = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")


# ==============================================================================
# 2. PAPERS, AUTHORS & CITATIONS
# ==============================================================================

class Paper(Base):
    __tablename__ = "papers"

    id = Column(String(64), primary_key=True)
    title = Column(String(512), nullable=False, index=True)
    title_normalized = Column(String(512), nullable=False, index=True)  # Lowercased, stripped for deduplication
    abstract = Column(Text, nullable=True)
    year = Column(Integer, index=True, default=lambda: datetime.now(timezone.utc).year)
    venue = Column(String(255), nullable=True, index=True)
    doi = Column(String(255), unique=True, nullable=True, index=True)  # Unique index prevents duplicate DOIs
    arxiv_id = Column(String(64), unique=True, nullable=True, index=True)  # Unique index prevents duplicate arXiv IDs
    openalex_id = Column(String(128), unique=True, nullable=True, index=True)
    citation_count = Column(Integer, default=0, index=True)
    reference_count = Column(Integer, default=0)
    influential_citation_count = Column(Integer, default=0)
    open_access_pdf_url = Column(String(1024), nullable=True)
    tldr = Column(Text, nullable=True)
    source = Column(String(32), default="local")  # openalex, arxiv, upload, local
    reading_status = Column(String(32), default="to-read", index=True)  # to-read, reading, completed, starred
    user_rating = Column(Integer, default=0)  # 1-5
    paper_intelligence = Column(JSON, nullable=True)  # Cached structured intelligence
    pdf_extracted = Column(JSON, nullable=True)  # Cache for fast serialized retrieval
    user_notes = Column(Text, nullable=True)
    tags = Column(JSON, default=list)  # User custom tag strings
    fields_of_study = Column(JSON, default=list)  # Legacy compatibility JSON field
    authors = Column(JSON, default=list)  # Legacy compatibility list of dicts
    references_list = Column(JSON, default=list)  # Legacy compatibility list of paper IDs
    uploader_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    date_added = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    author_associations = relationship("PaperAuthor", back_populates="paper", cascade="all, delete-orphan", order_by="PaperAuthor.author_order", lazy="selectin")
    topic_associations = relationship("PaperTopic", back_populates="paper", cascade="all, delete-orphan", lazy="selectin")
    citations_received = relationship("Citation", foreign_keys="Citation.cited_paper_id", back_populates="cited_paper", cascade="all, delete-orphan", lazy="selectin")
    citations_made = relationship("Citation", foreign_keys="Citation.citing_paper_id", back_populates="citing_paper", cascade="all, delete-orphan", lazy="selectin")
    collections = relationship("Collection", secondary="collection_papers", back_populates="papers", lazy="selectin")
    collection_associations = relationship("CollectionPaper", back_populates="paper", cascade="all, delete-orphan", viewonly=True)
    uploaded_documents = relationship("UploadedDocument", back_populates="paper", lazy="selectin")
    document_chunks = relationship("DocumentChunk", back_populates="paper", cascade="all, delete-orphan", lazy="selectin")

    __table_args__ = (
        Index("idx_papers_year_citation", "year", "citation_count"),
        Index("idx_papers_normalized_title_year", "title_normalized", "year"),
    )


class Author(Base):
    __tablename__ = "authors"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, index=True)
    normalized_name = Column(String(255), nullable=False, index=True)
    affiliation = Column(String(512), nullable=True)
    orcid = Column(String(32), unique=True, nullable=True, index=True)
    openalex_author_id = Column(String(128), unique=True, nullable=True, index=True)
    citation_count = Column(Integer, default=0, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    paper_associations = relationship("PaperAuthor", back_populates="author", cascade="all, delete-orphan")


class PaperAuthor(Base):
    __tablename__ = "paper_authors"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    paper_id = Column(String(64), ForeignKey("papers.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(String(64), ForeignKey("authors.id", ondelete="CASCADE"), nullable=False, index=True)
    author_order = Column(Integer, default=1, nullable=False)  # 1st author, 2nd author, etc.
    is_corresponding = Column(Boolean, default=False, nullable=False)

    # Unique constraint prevents linking same author to same paper twice
    __table_args__ = (
        UniqueConstraint("paper_id", "author_id", name="uq_paper_author"),
        Index("idx_paper_author_order", "paper_id", "author_order"),
    )

    # Relationships
    paper = relationship("Paper", back_populates="author_associations")
    author = relationship("Author", back_populates="paper_associations", lazy="joined")


class Citation(Base):
    __tablename__ = "citations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    citing_paper_id = Column(String(64), ForeignKey("papers.id", ondelete="CASCADE"), nullable=False, index=True)
    cited_paper_id = Column(String(64), ForeignKey("papers.id", ondelete="CASCADE"), nullable=False, index=True)
    citation_context = Column(Text, nullable=True)  # Sentence where paper is cited
    is_influential = Column(Boolean, default=False, nullable=False)  # Key methodological antecedent
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Unique constraint prevents duplicate directed edges in citation network
    __table_args__ = (
        UniqueConstraint("citing_paper_id", "cited_paper_id", name="uq_citation_pair"),
        Index("idx_citation_cited_paper", "cited_paper_id"),
    )

    # Relationships
    citing_paper = relationship("Paper", foreign_keys=[citing_paper_id], back_populates="citations_made")
    cited_paper = relationship("Paper", foreign_keys=[cited_paper_id], back_populates="citations_received")


# ==============================================================================
# 3. RESEARCH TOPICS & TAXONOMY
# ==============================================================================

class ResearchTopic(Base):
    __tablename__ = "research_topics"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    name = Column(String(128), unique=True, nullable=False, index=True)
    slug = Column(String(128), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(64), default="Computer Science", index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    paper_associations = relationship("PaperTopic", back_populates="topic", cascade="all, delete-orphan")


class PaperTopic(Base):
    __tablename__ = "paper_topics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    paper_id = Column(String(64), ForeignKey("papers.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(String(64), ForeignKey("research_topics.id", ondelete="CASCADE"), nullable=False, index=True)
    confidence_score = Column(Float, default=1.0)  # 0.0 to 1.0 classifier score

    __table_args__ = (
        UniqueConstraint("paper_id", "topic_id", name="uq_paper_topic"),
        Index("idx_paper_topic_score", "topic_id", "confidence_score"),
    )

    # Relationships
    paper = relationship("Paper", back_populates="topic_associations")
    topic = relationship("ResearchTopic", back_populates="paper_associations", lazy="joined")


# ==============================================================================
# 4. COLLECTIONS & WORKSPACES
# ==============================================================================

class Collection(Base):
    __tablename__ = "collections"

    id = Column(String(64), primary_key=True, default=lambda: f"col-{uuid.uuid4().hex[:8]}")
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(32), default="#6366f1")
    icon = Column(String(64), default="Folder")
    is_public = Column(Boolean, default=False, index=True)
    share_token = Column(String(64), unique=True, nullable=True, index=True)
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="collections")
    papers = relationship("Paper", secondary="collection_papers", back_populates="collections", lazy="selectin")
    paper_associations = relationship("CollectionPaper", back_populates="collection", cascade="all, delete-orphan", viewonly=True)
    reviews = relationship("LiteratureReview", back_populates="collection", lazy="selectin")


class CollectionPaper(Base):
    __tablename__ = "collection_papers"

    collection_id = Column(String(64), ForeignKey("collections.id", ondelete="CASCADE"), primary_key=True, index=True)
    paper_id = Column(String(64), ForeignKey("papers.id", ondelete="CASCADE"), primary_key=True, index=True)
    notes = Column(Text, nullable=True)
    user_rating = Column(Integer, default=0)
    added_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    collection = relationship("Collection", back_populates="paper_associations", overlaps="collections,papers")
    paper = relationship("Paper", back_populates="collection_associations", overlaps="collections,papers")


# ==============================================================================
# 5. UPLOADED DOCUMENTS & VECTOR CHUNKS
# ==============================================================================

class UploadedDocument(Base):
    __tablename__ = "uploaded_documents"

    id = Column(String(64), primary_key=True, default=lambda: f"doc-{uuid.uuid4().hex[:8]}")
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    paper_id = Column(String(64), ForeignKey("papers.id", ondelete="SET NULL"), nullable=True, index=True)
    filename = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(64), default="application/pdf")
    file_hash = Column(String(64), unique=True, nullable=False, index=True)  # SHA-256 prevents duplicate file uploads
    storage_path = Column(String(512), nullable=True)
    page_count = Column(Integer, default=1)
    extracted_title = Column(String(512), nullable=True)
    processing_status = Column(String(32), default="pending", index=True)  # pending, processing, completed, failed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="uploaded_documents")
    paper = relationship("Paper", back_populates="uploaded_documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan", order_by="DocumentChunk.chunk_index")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(64), primary_key=True, default=lambda: f"chunk-{uuid.uuid4().hex[:12]}")
    document_id = Column(String(64), ForeignKey("uploaded_documents.id", ondelete="CASCADE"), nullable=True, index=True)
    paper_id = Column(String(64), ForeignKey("papers.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, default=1)
    section_heading = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    token_count = Column(Integer, default=0)
    qdrant_point_id = Column(String(64), unique=True, nullable=False, index=True)  # 1-to-1 sync mapping with Qdrant point
    embedding_model = Column(String(64), default="BAAI/bge-small-en-v1.5")
    qdrant_synced_at = Column(DateTime, nullable=True, index=True)  # Timestamp of confirmed Qdrant synchronization
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("idx_document_chunk_order", "document_id", "chunk_index"),
        Index("idx_paper_chunk_order", "paper_id", "chunk_index"),
    )

    # Relationships
    document = relationship("UploadedDocument", back_populates="chunks")
    paper = relationship("Paper", back_populates="document_chunks")


# ==============================================================================
# 6. SESSIONS & CHAT MESSAGES (RAG ASSISTANT)
# ==============================================================================

class ResearchSession(Base):
    __tablename__ = "research_sessions"

    id = Column(String(64), primary_key=True, default=lambda: f"session-{uuid.uuid4().hex[:8]}")
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String(255), default="Untitled Research Query")
    mode = Column(String(32), default="comprehensive")  # comprehensive, concise, comparative, methodology
    paper_ids = Column(JSON, default=list)  # Target paper context list
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(64), ForeignKey("research_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(16), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    citations_payload = Column(JSON, default=list)  # List of {paperId, citeKey, quoteSnippet, confidence}
    token_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    session = relationship("ResearchSession", back_populates="messages")


# ==============================================================================
# 7. LITERATURE REVIEWS & PRISMA
# ==============================================================================

class LiteratureReview(Base):
    __tablename__ = "literature_reviews"

    id = Column(String(64), primary_key=True, default=lambda: f"review-{uuid.uuid4().hex[:8]}")
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    collection_id = Column(String(64), ForeignKey("collections.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(512), nullable=False)
    topic = Column(String(255), nullable=False, index=True)
    paper_ids = Column(JSON, default=list)
    executive_summary = Column(Text, nullable=False)
    sections = Column(JSON, default=list)  # list of {heading, content, citations}
    synthesis_matrix = Column(JSON, default=list)  # structured comparative matrix rows
    prisma_stats = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="reviews")
    collection = relationship("Collection", back_populates="reviews")


class PrismaProject(Base):
    __tablename__ = "prisma_projects"

    id = Column(String(64), primary_key=True, default=lambda: f"prisma-{uuid.uuid4().hex[:8]}")
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    research_question = Column(Text, nullable=False)
    inclusion_criteria = Column(JSON, default=list)
    exclusion_criteria = Column(JSON, default=list)
    records = Column(JSON, default=list)  # list of {paperId, stage, exclusionReason, timestamp}
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="prisma_projects")


# ==============================================================================
# 8. USER ACTIVITY & BACKGROUND JOBS
# ==============================================================================

class UserActivity(Base):
    __tablename__ = "user_activities"

    id = Column(String(64), primary_key=True, default=lambda: f"act-{uuid.uuid4().hex[:8]}")
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    activity_type = Column(String(64), nullable=False, index=True)  # search, view_paper, upload_pdf, synthesize_review, export_citations
    entity_type = Column(String(64), nullable=True)  # paper, collection, review
    entity_id = Column(String(64), nullable=True)
    title = Column(String(512), nullable=False)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="activities")


# Alias for legacy compatibility
ResearchActivity = UserActivity


class BackgroundJob(Base):
    __tablename__ = "background_jobs"

    id = Column(String(64), primary_key=True, default=lambda: f"job-{uuid.uuid4().hex[:8]}")
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    job_type = Column(String(64), nullable=False, default="pdf_ingestion", index=True)  # pdf_ingestion, vector_sync, review_synthesis
    status = Column(String(32), default="queued", index=True)  # queued, processing, completed, failed, retrying
    progress = Column(Integer, default=0)  # 0 to 100
    stage = Column(String(128), default="Queued")  # Validating, PyMuPDF Parsing, Chunking, Qdrant Embedding, Ready
    error_message = Column(Text, nullable=True)
    payload = Column(JSON, default=dict)  # Input parameters (filename, collectionId, etc.)
    result = Column(JSON, default=dict)  # Output data (paperId, vectorCount, etc.)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Convenience properties for backward compatibility
    @property
    def filename(self) -> str:
        return self.payload.get("filename", "document.pdf") if self.payload else "document.pdf"

    @filename.setter
    def filename(self, val: str):
        if self.payload is None:
            self.payload = {}
        # Work with dict copy to trigger SQLAlchemy JSON change detection if needed
        d = dict(self.payload)
        d["filename"] = val
        self.payload = d

    @property
    def paper_id(self) -> Optional[str]:
        return self.result.get("paper_id") if self.result else None

    @paper_id.setter
    def paper_id(self, val: Optional[str]):
        if self.result is None:
            self.result = {}
        d = dict(self.result)
        d["paper_id"] = val
        self.result = d

    @property
    def error(self) -> Optional[str]:
        return self.error_message

    # Relationships
    user = relationship("User", back_populates="background_jobs")


# Alias for legacy compatibility
DocumentJob = BackgroundJob
