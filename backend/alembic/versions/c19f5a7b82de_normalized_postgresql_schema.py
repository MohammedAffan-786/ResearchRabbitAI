"""normalized postgresql schema

Revision ID: c19f5a7b82de
Revises: a8160eec1a5a
Create Date: 2026-11-13 21:48:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine import reflection

# revision identifiers, used by Alembic.
revision = 'c19f5a7b82de'
down_revision = 'a8160eec1a5a'
branch_labels = None
depends_on = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = reflection.Inspector.from_engine(conn)
    existing_tables = inspector.get_table_names()

    # Add missing columns to users
    if "users" in existing_tables:
        user_cols = [c['name'] for c in inspector.get_columns('users')]
        with op.batch_alter_table("users") as batch_op:
            if "is_superuser" not in user_cols:
                batch_op.add_column(sa.Column("is_superuser", sa.Boolean(), server_default=sa.text("0"), nullable=False))
            if "updated_at" not in user_cols:
                batch_op.add_column(sa.Column("updated_at", sa.DateTime(), nullable=True))

    # Add missing columns to papers
    if "papers" in existing_tables:
        paper_cols = [c['name'] for c in inspector.get_columns('papers')]
        with op.batch_alter_table("papers") as batch_op:
            if "title_normalized" not in paper_cols:
                batch_op.add_column(sa.Column("title_normalized", sa.String(length=512), nullable=True))
            if "openalex_id" not in paper_cols:
                batch_op.add_column(sa.Column("openalex_id", sa.String(length=128), nullable=True))
            if "created_at" not in paper_cols:
                batch_op.add_column(sa.Column("created_at", sa.DateTime(), nullable=True))
            if "updated_at" not in paper_cols:
                batch_op.add_column(sa.Column("updated_at", sa.DateTime(), nullable=True))

    # Add missing columns to collection_papers
    if "collection_papers" in existing_tables:
        col_paper_cols = [c['name'] for c in inspector.get_columns('collection_papers')]
        with op.batch_alter_table("collection_papers") as batch_op:
            if "notes" not in col_paper_cols:
                batch_op.add_column(sa.Column("notes", sa.Text(), nullable=True))
            if "user_rating" not in col_paper_cols:
                batch_op.add_column(sa.Column("user_rating", sa.Integer(), server_default=sa.text("0"), nullable=True))
            if "added_at" not in col_paper_cols:
                batch_op.add_column(sa.Column("added_at", sa.DateTime(), nullable=True))

    # Add missing columns to literature_reviews
    if "literature_reviews" in existing_tables:
        lr_cols = [c['name'] for c in inspector.get_columns('literature_reviews')]
        with op.batch_alter_table("literature_reviews") as batch_op:
            if "collection_id" not in lr_cols:
                batch_op.add_column(sa.Column("collection_id", sa.String(length=64), nullable=True))

    # 1. RefreshTokens
    if "refresh_tokens" not in existing_tables:
        op.create_table(
            "refresh_tokens",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("token_hash", sa.String(length=255), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("is_revoked", sa.Boolean(), default=False, nullable=False),
            sa.Column("revoked_at", sa.DateTime(), nullable=True),
            sa.Column("replaced_by_token", sa.String(length=255), nullable=True),
            sa.Column("user_agent", sa.String(length=512), nullable=True),
            sa.Column("ip_address", sa.String(length=64), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=True)
        op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])

    # 2. Authors
    if "authors" not in existing_tables:
        op.create_table(
            "authors",
            sa.Column("id", sa.String(length=64), primary_key=True),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("normalized_name", sa.String(length=255), nullable=False),
            sa.Column("affiliation", sa.String(length=512), nullable=True),
            sa.Column("orcid", sa.String(length=32), unique=True, nullable=True),
            sa.Column("openalex_author_id", sa.String(length=128), unique=True, nullable=True),
            sa.Column("citation_count", sa.Integer(), default=0),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_authors_name", "authors", ["name"])
        op.create_index("ix_authors_normalized_name", "authors", ["normalized_name"])

    # 3. PaperAuthors
    if "paper_authors" not in existing_tables:
        op.create_table(
            "paper_authors",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("paper_id", sa.String(length=64), sa.ForeignKey("papers.id", ondelete="CASCADE"), nullable=False),
            sa.Column("author_id", sa.String(length=64), sa.ForeignKey("authors.id", ondelete="CASCADE"), nullable=False),
            sa.Column("author_order", sa.Integer(), default=1, nullable=False),
            sa.Column("is_corresponding", sa.Boolean(), default=False, nullable=False),
            sa.UniqueConstraint("paper_id", "author_id", name="uq_paper_author")
        )
        op.create_index("ix_paper_authors_paper_id", "paper_authors", ["paper_id"])
        op.create_index("ix_paper_authors_author_id", "paper_authors", ["author_id"])

    # 4. Citations
    if "citations" not in existing_tables:
        op.create_table(
            "citations",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("citing_paper_id", sa.String(length=64), sa.ForeignKey("papers.id", ondelete="CASCADE"), nullable=False),
            sa.Column("cited_paper_id", sa.String(length=64), sa.ForeignKey("papers.id", ondelete="CASCADE"), nullable=False),
            sa.Column("citation_context", sa.Text(), nullable=True),
            sa.Column("is_influential", sa.Boolean(), default=False, nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.UniqueConstraint("citing_paper_id", "cited_paper_id", name="uq_citation_pair")
        )
        op.create_index("ix_citations_citing", "citations", ["citing_paper_id"])
        op.create_index("ix_citations_cited", "citations", ["cited_paper_id"])

    # 5. ResearchTopics
    if "research_topics" not in existing_tables:
        op.create_table(
            "research_topics",
            sa.Column("id", sa.String(length=64), primary_key=True),
            sa.Column("name", sa.String(length=128), unique=True, nullable=False),
            sa.Column("slug", sa.String(length=128), unique=True, nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("category", sa.String(length=64), default="Computer Science"),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_research_topics_slug", "research_topics", ["slug"])

    # 6. PaperTopics
    if "paper_topics" not in existing_tables:
        op.create_table(
            "paper_topics",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("paper_id", sa.String(length=64), sa.ForeignKey("papers.id", ondelete="CASCADE"), nullable=False),
            sa.Column("topic_id", sa.String(length=64), sa.ForeignKey("research_topics.id", ondelete="CASCADE"), nullable=False),
            sa.Column("confidence_score", sa.Float(), default=1.0),
            sa.UniqueConstraint("paper_id", "topic_id", name="uq_paper_topic")
        )
        op.create_index("ix_paper_topics_paper", "paper_topics", ["paper_id"])
        op.create_index("ix_paper_topics_topic", "paper_topics", ["topic_id"])

    # 7. UploadedDocuments
    if "uploaded_documents" not in existing_tables:
        op.create_table(
            "uploaded_documents",
            sa.Column("id", sa.String(length=64), primary_key=True),
            sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("paper_id", sa.String(length=64), sa.ForeignKey("papers.id", ondelete="SET NULL"), nullable=True),
            sa.Column("filename", sa.String(length=255), nullable=False),
            sa.Column("file_size_bytes", sa.Integer(), nullable=False),
            sa.Column("mime_type", sa.String(length=64), default="application/pdf"),
            sa.Column("file_hash", sa.String(length=64), unique=True, nullable=False),
            sa.Column("storage_path", sa.String(length=512), nullable=True),
            sa.Column("page_count", sa.Integer(), default=1),
            sa.Column("extracted_title", sa.String(length=512), nullable=True),
            sa.Column("processing_status", sa.String(length=32), default="pending"),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_uploaded_docs_hash", "uploaded_documents", ["file_hash"])

    # 8. DocumentChunks
    if "document_chunks" not in existing_tables:
        op.create_table(
            "document_chunks",
            sa.Column("id", sa.String(length=64), primary_key=True),
            sa.Column("document_id", sa.String(length=64), sa.ForeignKey("uploaded_documents.id", ondelete="CASCADE"), nullable=True),
            sa.Column("paper_id", sa.String(length=64), sa.ForeignKey("papers.id", ondelete="CASCADE"), nullable=False),
            sa.Column("chunk_index", sa.Integer(), nullable=False),
            sa.Column("page_number", sa.Integer(), default=1),
            sa.Column("section_heading", sa.String(length=255), nullable=True),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("token_count", sa.Integer(), default=0),
            sa.Column("qdrant_point_id", sa.String(length=64), unique=True, nullable=False),
            sa.Column("embedding_model", sa.String(length=64), default="BAAI/bge-small-en-v1.5"),
            sa.Column("qdrant_synced_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_doc_chunks_qdrant", "document_chunks", ["qdrant_point_id"])
        op.create_index("ix_doc_chunks_paper", "document_chunks", ["paper_id"])

    # 9. ChatMessages
    if "chat_messages" not in existing_tables:
        op.create_table(
            "chat_messages",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("session_id", sa.String(length=64), sa.ForeignKey("research_sessions.id", ondelete="CASCADE"), nullable=False),
            sa.Column("role", sa.String(length=16), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("citations_payload", sa.JSON(), default=list),
            sa.Column("token_count", sa.Integer(), default=0),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_chat_messages_session", "chat_messages", ["session_id"])

    # 10. BackgroundJobs
    if "background_jobs" not in existing_tables:
        op.create_table(
            "background_jobs",
            sa.Column("id", sa.String(length=64), primary_key=True),
            sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
            sa.Column("job_type", sa.String(length=64), default="pdf_ingestion", nullable=False),
            sa.Column("status", sa.String(length=32), default="queued"),
            sa.Column("progress", sa.Integer(), default=0),
            sa.Column("stage", sa.String(length=128), default="Queued"),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("payload", sa.JSON(), default=dict),
            sa.Column("result", sa.JSON(), default=dict),
            sa.Column("retry_count", sa.Integer(), default=0),
            sa.Column("max_retries", sa.Integer(), default=3),
            sa.Column("started_at", sa.DateTime(), nullable=True),
            sa.Column("completed_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_bg_jobs_status", "background_jobs", ["status"])

def downgrade() -> None:
    op.drop_table("background_jobs")
    op.drop_table("chat_messages")
    op.drop_table("document_chunks")
    op.drop_table("uploaded_documents")
    op.drop_table("paper_topics")
    op.drop_table("research_topics")
    op.drop_table("citations")
    op.drop_table("paper_authors")
    op.drop_table("authors")
    op.drop_table("refresh_tokens")
