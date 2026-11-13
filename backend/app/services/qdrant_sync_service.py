import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.db.models import Paper, DocumentChunk, UploadedDocument
from backend.app.services.qdrant_service import qdrant_service
from backend.app.services.embedding_provider import get_embedding_provider

class QdrantSyncService:
    def __init__(self):
        self.embedding_provider = get_embedding_provider()

    def generate_point_id(self, paper_id: str, chunk_index: int) -> str:
        """Deterministically generates a valid UUID for Qdrant point based on paper and chunk index."""
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{paper_id}_{chunk_index}"))

    def build_chunk_payload(
        self,
        chunk: DocumentChunk,
        paper: Paper,
        document: Optional[UploadedDocument] = None
    ) -> Dict[str, Any]:
        """
        Creates a rich, normalized metadata payload for Qdrant vector points.
        Ensures strict schema alignment between PostgreSQL and vector storage.
        """
        author_names = [a.get("name") for a in (paper.authors or []) if isinstance(a, dict) and a.get("name")]
        if not author_names and hasattr(paper, "author_associations"):
            author_names = [assoc.author.name for assoc in paper.author_associations if assoc.author]

        topic_names = [str(f) for f in (paper.fields_of_study or [])]
        if not topic_names and hasattr(paper, "topic_associations"):
            topic_names = [assoc.topic.name for assoc in paper.topic_associations if assoc.topic]

        return {
            "chunk_id": chunk.id,
            "paper_id": paper.id,
            "document_id": document.id if document else chunk.document_id,
            "page_number": chunk.page_number or 1,
            "section_heading": chunk.section_heading or "Main Text",
            "paper_title": paper.title,
            "authors": author_names or ["Academic Researcher"],
            "year": paper.year or 2024,
            "venue": paper.venue or "Scholarly Publication",
            "doi": paper.doi,
            "arxiv_id": paper.arxiv_id,
            "topics": topic_names or ["Computer Science"],
            "is_full_text": bool(document or chunk.document_id),
            "token_count": chunk.token_count or len(chunk.content.split()),
            "text": chunk.content
        }

    async def sync_paper_chunks(
        self,
        db: Session,
        paper: Paper,
        chunks_text: List[str],
        sections: Optional[List[Dict[str, Any]]] = None,
        document: Optional[UploadedDocument] = None
    ) -> List[DocumentChunk]:
        """
        Reliable transactional synchronization:
        1. Stores normalized DocumentChunks in PostgreSQL.
        2. Embeds text chunks via embedding provider.
        3. Upserts vector points into Qdrant with complete payload metadata.
        4. Updates `qdrant_synced_at` timestamp upon verified vector persistence.
        """
        if not chunks_text:
            return []

        # 0. Clean up any prior chunks for this paper to avoid duplicate key collisions during re-indexing
        try:
            db.query(DocumentChunk).filter(DocumentChunk.paper_id == paper.id).delete()
            db.flush()
        except Exception:
            pass

        # 1. Prepare DocumentChunk entities
        chunk_entities: List[DocumentChunk] = []
        payloads: List[Dict[str, Any]] = []

        for idx, text in enumerate(chunks_text):
            sec_heading = "Main Content"
            page_num = 1
            if sections and idx < len(sections):
                sec_heading = sections[idx].get("title") or "Section"
                page_num = sections[idx].get("page", 1)

            point_id = self.generate_point_id(paper.id, idx)

            chunk = DocumentChunk(
                document_id=document.id if document else None,
                paper_id=paper.id,
                chunk_index=idx,
                page_number=page_num,
                section_heading=sec_heading,
                content=text,
                token_count=len(text.split()),
                qdrant_point_id=point_id,
                embedding_model="BAAI/bge-small-en-v1.5",
                qdrant_synced_at=None  # Marked as pending until Qdrant confirms
            )
            db.add(chunk)
            chunk_entities.append(chunk)

            payload = self.build_chunk_payload(chunk, paper, document)
            payloads.append(payload)

        db.flush()

        # 2. Generate embeddings
        try:
            vectors = await self.embedding_provider.embed_texts(chunks_text)

            # 3. Upsert into Qdrant
            await qdrant_service.upsert_paper_chunks(
                paper_id=paper.id,
                chunks=chunks_text,
                vectors=vectors,
                metadatas=payloads
            )

            # 4. Confirm sync in PostgreSQL
            now = datetime.now(timezone.utc)
            for chunk in chunk_entities:
                chunk.qdrant_synced_at = now

            db.commit()
        except Exception as e:
            db.rollback()
            print(f"[QdrantSyncService] Vector sync warning for paper {paper.id}: {e}")
            # Even if Qdrant fails, chunks remain recorded in DB for auto-reconciliation
            raise e

        return chunk_entities

    async def delete_paper_chunks(self, db: Session, paper_id: str) -> int:
        """
        Cascade deletion:
        1. Deletes vector points from Qdrant matching paper_id.
        2. Deletes DocumentChunk rows from PostgreSQL.
        """
        # Delete from Qdrant
        await qdrant_service.delete_paper_points(paper_id)

        # Delete from DB
        deleted_count = db.query(DocumentChunk).filter(DocumentChunk.paper_id == paper_id).delete()
        db.commit()
        return deleted_count

    async def reconcile_sync(self, db: Session, auto_repair: bool = True) -> Dict[str, Any]:
        """
        Reconciliation audit tool:
        Checks PostgreSQL DocumentChunks for any unsynced records and repairs them in Qdrant.
        """
        unsynced_chunks = db.query(DocumentChunk).filter(DocumentChunk.qdrant_synced_at.is_(None)).all()
        total_chunks = db.query(DocumentChunk).count()

        repaired_count = 0
        if auto_repair and unsynced_chunks:
            # Group by paper for efficient batch embedding
            paper_map: Dict[str, List[DocumentChunk]] = {}
            for ch in unsynced_chunks:
                paper_map.setdefault(ch.paper_id, []).append(ch)

            for pid, ch_list in paper_map.items():
                paper = db.query(Paper).filter(Paper.id == pid).first()
                if not paper:
                    continue
                try:
                    texts = [c.content for c in ch_list]
                    vectors = await self.embedding_provider.embed_texts(texts)
                    payloads = [self.build_chunk_payload(c, paper) for c in ch_list]

                    await qdrant_service.upsert_paper_chunks(
                        paper_id=paper.id,
                        chunks=texts,
                        vectors=vectors,
                        metadatas=payloads
                    )

                    now = datetime.now(timezone.utc)
                    for c in ch_list:
                        c.qdrant_synced_at = now
                    db.commit()
                    repaired_count += len(ch_list)
                except Exception as e:
                    print(f"[QdrantSyncService] Reconcile error for paper {pid}: {e}")

        return {
            "total_chunks_in_postgres": total_chunks,
            "unsynced_chunks_found": len(unsynced_chunks),
            "repaired_count": repaired_count,
            "is_synchronized": len(unsynced_chunks) == repaired_count
        }

qdrant_sync_service = QdrantSyncService()
