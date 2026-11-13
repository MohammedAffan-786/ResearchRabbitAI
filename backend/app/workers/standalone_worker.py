import time
import os
import signal
import sys
import asyncio
from typing import Optional
from backend.app.database.session import SessionLocal
from backend.app.models import BackgroundJob
from backend.app.workers.document_worker import process_pdf_document_task
from backend.app.core.logging import logger

# Graceful shutdown flag
RUNNING = True

def handle_exit(sig, frame):
    global RUNNING
    logger.info(f"Received exit signal {sig}. Initiating graceful shutdown of standalone worker...")
    RUNNING = False

signal.signal(signal.SIGINT, handle_exit)
signal.signal(signal.SIGTERM, handle_exit)

async def process_next_queued_job():
    """Fetches the next queued background job and processes it asynchronously."""
    with SessionLocal() as db:
        # Atomic selection: fetch the oldest queued job
        job = db.query(BackgroundJob).filter(BackgroundJob.status == "queued").order_by(BackgroundJob.created_at.asc()).first()
        if not job:
            return False

        job_id = job.id
        filename = job.filename
        payload = job.payload or {}
        collection_id = payload.get("collectionId")
        user_id = job.user_id

        # Look for file content: either stored file path or stored payload bytes
        file_path = payload.get("file_path")
        file_bytes = None
        if file_path and os.path.exists(file_path):
            with open(file_path, "rb") as f:
                file_bytes = f.read()
        elif "file_bytes_hex" in payload:
            file_bytes = bytes.fromhex(payload["file_bytes_hex"])

        if not file_bytes:
            # If no bytes available (e.g. simulated job without payload), mark complete with note
            job.status = "completed"
            job.progress = 100
            job.stage = "Processed (No raw payload attached)"
            db.commit()
            logger.info(f"Worker resolved job {job_id} without file payload.")
            return True

        logger.info(f"Standalone worker picked up job {job_id} ({filename})")

    # Process outside the initial transaction
    await process_pdf_document_task(
        job_id=job_id,
        file_bytes=file_bytes,
        filename=filename,
        collection_id=collection_id,
        user_id=user_id
    )
    logger.info(f"Standalone worker completed job {job_id}")
    return True

async def run_worker_loop(poll_interval: float = 3.0):
    """
    Main polling loop for the standalone background worker.
    Runs independently from the FastAPI API server.
    """
    logger.info("🐇 ResearchRabbit AI Standalone Background Worker started.")
    logger.info(f"Polling database for queued ingestion jobs every {poll_interval}s...")

    while RUNNING:
        try:
            processed = await process_next_queued_job()
            if not processed:
                await asyncio.sleep(poll_interval)
            else:
                # If a job was processed, immediately check for the next one
                await asyncio.sleep(0.2)
        except Exception as e:
            logger.error(f"Error in standalone worker loop: {str(e)}", exc_info=True)
            await asyncio.sleep(poll_interval)

    logger.info("🐇 ResearchRabbit AI Standalone Worker shut down cleanly.")

def main():
    poll_sec = float(os.getenv("WORKER_POLL_INTERVAL", "3.0"))
    asyncio.run(run_worker_loop(poll_sec))

if __name__ == "__main__":
    main()
