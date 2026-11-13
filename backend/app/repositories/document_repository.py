from typing import Optional, List
from sqlalchemy.orm import Session
from backend.app.models import UploadedDocument, DocumentChunk, BackgroundJob
from backend.app.repositories.base_repository import BaseRepository

class DocumentRepository(BaseRepository[UploadedDocument]):
    def __init__(self, db: Session):
        super().__init__(UploadedDocument, db)

    def get_by_hash(self, file_hash: str) -> Optional[UploadedDocument]:
        return self.db.query(UploadedDocument).filter(UploadedDocument.file_hash == file_hash).first()

    def get_job(self, job_id: str) -> Optional[BackgroundJob]:
        return self.db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()

    def create_job(self, job: BackgroundJob) -> BackgroundJob:
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def list_unsynced_chunks(self) -> List[DocumentChunk]:
        return self.db.query(DocumentChunk).filter(DocumentChunk.qdrant_synced_at.is_(None)).all()
