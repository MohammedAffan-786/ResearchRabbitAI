from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session

from backend.app.core.dependencies import get_db, get_optional_current_user_id, rate_limit_upload
from backend.app.services.document_processing.secure_file import validate_pdf_file, compute_file_sha256
from backend.app.services.document_processing.pdf_processor import pdf_processor
from backend.app.services.paper_deduplication import deduplication_service
from backend.app.services.qdrant_sync_service import qdrant_sync_service
from backend.app.workers.document_worker import process_pdf_document_task, extract_paper_intelligence
from backend.app.models import BackgroundJob, UploadedDocument, Paper, Collection
from backend.app.schemas.document import DocumentUploadResponse, AsyncUploadResponse, JobStatusResponse
from backend.app.api.routes.search import serialize_paper_model

router = APIRouter(tags=["Document Ingestion"], dependencies=[Depends(rate_limit_upload)])

@router.post("/papers/upload", response_model=DocumentUploadResponse)
@router.post("/documents/upload", response_model=DocumentUploadResponse)
async def upload_pdf(
    pdf: UploadFile = File(...),
    collectionId: Optional[str] = Form(None),
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    contents = await pdf.read()
    _, safe_filename = validate_pdf_file(contents, pdf.filename or "paper.pdf")
    file_hash = compute_file_sha256(contents)

    # 1. Deduplication check: check if file hash was already uploaded
    existing_doc = db.query(UploadedDocument).filter(UploadedDocument.file_hash == file_hash).first()
    if existing_doc and existing_doc.paper_id:
        existing_paper = db.query(Paper).filter(Paper.id == existing_doc.paper_id).first()
        if existing_paper:
            if collectionId:
                col = db.query(Collection).filter(Collection.id == collectionId).first()
                if col and existing_paper not in col.papers:
                    col.papers.append(existing_paper)
                    db.commit()
            return DocumentUploadResponse(
                success=True,
                paper=serialize_paper_model(existing_paper),
                message=f"Deduplication matched: '{existing_paper.title}' was already indexed."
            )

    # 2. Parse PDF with PyMuPDF
    parsed = pdf_processor.parse_pdf(contents, safe_filename)

    paper_data = {
        "title": parsed["title"],
        "authors": parsed["authors"],
        "abstract": parsed["abstract"],
        "year": parsed["year"],
        "venue": "Uploaded PDF Document",
        "citation_count": 1,
        "reference_count": len(parsed["references"]),
        "fields_of_study": ["Computer Science", "Ingested Document"],
        "source": "upload",
        "pdf_extracted": {
            "sections": parsed["sections"],
            "references": parsed["references"],
            "full_text": parsed["full_text"]
        },
        "reading_status": "reading",
        "user_rating": 5,
        "tags": ["Uploaded PDF"],
        "uploader_id": user_id
    }

    new_paper, is_new = deduplication_service.get_or_create_paper(db, paper_data)

    uploaded_doc = UploadedDocument(
        user_id=user_id,
        paper_id=new_paper.id,
        filename=safe_filename,
        file_size_bytes=len(contents),
        mime_type="application/pdf",
        file_hash=file_hash,
        page_count=len(parsed["sections"]) or 1,
        extracted_title=parsed["title"],
        processing_status="completed"
    )
    db.add(uploaded_doc)

    if collectionId:
        col = db.query(Collection).filter(Collection.id == collectionId).first()
        if col and new_paper not in col.papers:
            col.papers.append(new_paper)

    db.commit()
    db.refresh(new_paper)

    # 3. Synchronize chunks to Qdrant
    if parsed["chunks"]:
        await qdrant_sync_service.sync_paper_chunks(
            db=db,
            paper=new_paper,
            chunks_text=parsed["chunks"][:15],
            sections=parsed["sections"],
            document=uploaded_doc
        )

    # 4. Extract structured intelligence
    intel = await extract_paper_intelligence(new_paper)
    new_paper.paper_intelligence = intel
    db.commit()

    return DocumentUploadResponse(
        success=True,
        paper=serialize_paper_model(new_paper),
        message=f"Successfully analyzed and indexed '{new_paper.title}'"
    )

@router.post("/papers/upload/async", response_model=AsyncUploadResponse)
@router.post("/documents/upload/async", response_model=AsyncUploadResponse)
async def upload_pdf_async(
    background_tasks: BackgroundTasks,
    pdf: UploadFile = File(...),
    collectionId: Optional[str] = Form(None),
    user_id: Optional[str] = Depends(get_optional_current_user_id),
    db: Session = Depends(get_db)
):
    contents = await pdf.read()
    _, safe_filename = validate_pdf_file(contents, pdf.filename or "paper.pdf")

    job = BackgroundJob(
        user_id=user_id,
        job_type="pdf_ingestion",
        filename=safe_filename,
        status="queued",
        progress=10,
        stage="Validating Document",
        payload={"filename": safe_filename, "collectionId": collectionId}
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(
        process_pdf_document_task,
        job.id,
        contents,
        safe_filename,
        collectionId,
        user_id
    )

    return AsyncUploadResponse(
        jobId=job.id,
        filename=job.filename,
        status=job.status,
        progress=job.progress,
        stage=job.stage
    )

@router.get("/papers/upload/status/{job_id}", response_model=JobStatusResponse)
@router.get("/documents/upload/status/{job_id}", response_model=JobStatusResponse)
def get_upload_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobStatusResponse(
        jobId=job.id,
        status=job.status,
        progress=job.progress,
        stage=job.stage,
        paperId=job.paper_id,
        error=job.error_message,
        createdAt=job.created_at.isoformat() if job.created_at else None
    )
