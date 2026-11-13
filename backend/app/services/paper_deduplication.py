import re
import hashlib
from typing import Optional, Dict, Any, Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from backend.app.db.models import Paper, Author, PaperAuthor, ResearchTopic, PaperTopic, UploadedDocument

def normalize_title(title: str) -> str:
    """
    Normalizes paper title for robust deduplication:
    - Lowercase
    - Strip punctuation and special characters
    - Collapse multiple spaces
    """
    if not title:
        return ""
    cleaned = re.sub(r"[^\w\s]", " ", title.lower())
    return re.sub(r"\s+", " ", cleaned).strip()

def normalize_doi(doi: Optional[str]) -> Optional[str]:
    """
    Normalizes DOI to standard format (e.g., 10.1145/3065386):
    Strips 'https://doi.org/', 'http://dx.doi.org/', 'doi:', and trims spaces.
    """
    if not doi:
        return None
    clean = doi.strip().lower()
    clean = re.sub(r"^https?://(dx\.)?doi\.org/", "", clean)
    clean = re.sub(r"^doi:\s*", "", clean)
    return clean.strip() or None

def normalize_arxiv_id(arxiv_id: Optional[str]) -> Optional[str]:
    """
    Normalizes arXiv ID:
    Strips 'arxiv:', URLs, and version suffixes like 'v1', 'v2'.
    """
    if not arxiv_id:
        return None
    clean = arxiv_id.strip().lower()
    clean = re.sub(r"^https?://arxiv\.org/(abs|pdf)/", "", clean)
    clean = re.sub(r"^arxiv:\s*", "", clean)
    clean = re.sub(r"v\d+$", "", clean)
    return clean.strip() or None

def compute_file_sha256(file_bytes: bytes) -> str:
    """Computes SHA-256 hash for document content to prevent duplicate file uploads."""
    hasher = hashlib.sha256()
    hasher.update(file_bytes)
    return hasher.hexdigest()

class PaperDeduplicationService:
    def find_existing_paper(
        self,
        db: Session,
        *,
        doi: Optional[str] = None,
        arxiv_id: Optional[str] = None,
        openalex_id: Optional[str] = None,
        title: Optional[str] = None,
        year: Optional[int] = None
    ) -> Optional[Paper]:
        """
        Multi-tier deduplication lookup:
        1. Exact DOI match
        2. Exact arXiv ID match
        3. Exact OpenAlex ID match
        4. Normalized title + Publication year match
        """
        norm_doi = normalize_doi(doi)
        if norm_doi:
            existing = db.query(Paper).filter(func.lower(Paper.doi) == norm_doi).first()
            if existing:
                return existing

        norm_arxiv = normalize_arxiv_id(arxiv_id)
        if norm_arxiv:
            existing = db.query(Paper).filter(func.lower(Paper.arxiv_id) == norm_arxiv).first()
            if existing:
                return existing

        if openalex_id:
            clean_openalex = openalex_id.strip()
            existing = db.query(Paper).filter(Paper.openalex_id == clean_openalex).first()
            if existing:
                return existing

        if title:
            norm_title = normalize_title(title)
            if len(norm_title) >= 12:
                query = db.query(Paper).filter(Paper.title_normalized == norm_title)
                if year:
                    # Allow +/- 1 year tolerance for preprints vs published venue discrepancy
                    query = query.filter(Paper.year.between(year - 1, year + 1))
                existing = query.first()
                if existing:
                    return existing

        return None

    def get_or_create_author(self, db: Session, author_dict: Dict[str, Any]) -> Author:
        """Finds or creates an author by normalized name or ORCID."""
        name = (author_dict.get("name") or "Academic Researcher").strip()
        norm_name = re.sub(r"\s+", " ", name.lower()).strip()
        orcid = author_dict.get("orcid")

        if orcid:
            existing = db.query(Author).filter(Author.orcid == orcid).first()
            if existing:
                return existing

        existing = db.query(Author).filter(Author.normalized_name == norm_name).first()
        if existing:
            if not existing.affiliation and author_dict.get("affiliation"):
                existing.affiliation = author_dict.get("affiliation")
            return existing

        author = Author(
            name=name,
            normalized_name=norm_name,
            affiliation=author_dict.get("affiliation"),
            orcid=orcid,
            openalex_author_id=author_dict.get("openalex_author_id")
        )
        db.add(author)
        db.flush()
        return author

    def get_or_create_topic(self, db: Session, topic_name: str) -> ResearchTopic:
        """Finds or creates a research topic by name/slug."""
        clean_name = topic_name.strip()
        slug = re.sub(r"[^\w\s-]", "", clean_name.lower()).replace(" ", "-")

        existing = db.query(ResearchTopic).filter(
            or_(ResearchTopic.name == clean_name, ResearchTopic.slug == slug)
        ).first()
        if existing:
            return existing

        topic = ResearchTopic(
            name=clean_name,
            slug=slug,
            category="Academic Literature"
        )
        db.add(topic)
        db.flush()
        return topic

    def get_or_create_paper(
        self,
        db: Session,
        paper_data: Dict[str, Any]
    ) -> Tuple[Paper, bool]:
        """
        Deduplicates paper records:
        - If existing paper found, merges any newly available metadata and returns (paper, False).
        - If new, creates Paper entity, normalized Authors, and Topics, and returns (paper, True).
        """
        norm_doi = normalize_doi(paper_data.get("doi"))
        norm_arxiv = normalize_arxiv_id(paper_data.get("arxiv_id"))
        raw_title = paper_data.get("title", "Untitled Manuscript").strip()
        norm_title = normalize_title(raw_title)
        year = paper_data.get("year", 2024)

        existing = self.find_existing_paper(
            db,
            doi=norm_doi,
            arxiv_id=norm_arxiv,
            openalex_id=paper_data.get("openalex_id"),
            title=raw_title,
            year=year
        )

        if existing:
            # Merge enriched metadata without overwriting existing high-confidence fields
            if not existing.doi and norm_doi:
                existing.doi = norm_doi
            if not existing.arxiv_id and norm_arxiv:
                existing.arxiv_id = norm_arxiv
            if not existing.abstract and paper_data.get("abstract"):
                existing.abstract = paper_data.get("abstract")
            if not existing.open_access_pdf_url and paper_data.get("open_access_pdf_url"):
                existing.open_access_pdf_url = paper_data.get("open_access_pdf_url")
            if not existing.venue and paper_data.get("venue"):
                existing.venue = paper_data.get("venue")
            if paper_data.get("citation_count", 0) > (existing.citation_count or 0):
                existing.citation_count = paper_data.get("citation_count")

            db.flush()
            return existing, False

        # Create new Paper entity
        paper_id = paper_data.get("id") or f"p-{normalize_title(raw_title)[:24].replace(' ', '-')}-{year}"
        # Ensure ID is unique in DB
        if db.query(Paper).filter(Paper.id == paper_id).first():
            import uuid
            paper_id = f"{paper_id[:30]}-{uuid.uuid4().hex[:6]}"

        new_paper = Paper(
            id=paper_id,
            title=raw_title,
            title_normalized=norm_title,
            abstract=paper_data.get("abstract"),
            year=year,
            venue=paper_data.get("venue"),
            doi=norm_doi,
            arxiv_id=norm_arxiv,
            openalex_id=paper_data.get("openalex_id"),
            citation_count=paper_data.get("citation_count", 0),
            reference_count=paper_data.get("reference_count", 0),
            influential_citation_count=paper_data.get("influential_citation_count", 0),
            open_access_pdf_url=paper_data.get("open_access_pdf_url"),
            tldr=paper_data.get("tldr"),
            source=paper_data.get("source", "local"),
            reading_status=paper_data.get("reading_status", "to-read"),
            user_rating=paper_data.get("user_rating", 0),
            paper_intelligence=paper_data.get("paper_intelligence"),
            pdf_extracted=paper_data.get("pdf_extracted"),
            user_notes=paper_data.get("user_notes"),
            tags=paper_data.get("tags", []),
            fields_of_study=paper_data.get("fields_of_study", []),
            authors=paper_data.get("authors", []),
            references_list=paper_data.get("references_list", []),
            uploader_id=paper_data.get("uploader_id")
        )
        db.add(new_paper)
        db.flush()

        # Link normalized Authors
        for idx, a_dict in enumerate(paper_data.get("authors", [])):
            if isinstance(a_dict, dict) and a_dict.get("name"):
                author = self.get_or_create_author(db, a_dict)
                db.add(PaperAuthor(
                    paper_id=new_paper.id,
                    author_id=author.id,
                    author_order=idx + 1,
                    is_corresponding=(idx == 0)
                ))

        # Link normalized Topics
        for top_name in paper_data.get("fields_of_study", []):
            if top_name and isinstance(top_name, str):
                topic = self.get_or_create_topic(db, top_name)
                db.add(PaperTopic(
                    paper_id=new_paper.id,
                    topic_id=topic.id,
                    confidence_score=1.0
                ))

        db.flush()
        return new_paper, True

deduplication_service = PaperDeduplicationService()
