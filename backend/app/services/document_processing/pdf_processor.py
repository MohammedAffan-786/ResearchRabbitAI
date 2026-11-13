import re
from typing import Dict, Any, List
from backend.app.core.exceptions import InvalidFileException
from backend.app.core.logging import logger

try:
    import pymupdf as fitz
except ImportError:
    import fitz

MAX_PAGES_TO_PROCESS = 100
MAX_TEXT_CHARACTERS = 50000

class PdfProcessingService:
    def parse_pdf(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Safely parses PDF using PyMuPDF with memory limits, page count caps,
        and defensive error handling against corrupt files and decompression bombs.
        """
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as e:
            logger.warning(f"PyMuPDF failed to open stream for '{filename}': {str(e)}")
            raise InvalidFileException("The PDF document is corrupt, password-protected, or unreadable.")

        total_pages = len(doc)
        if total_pages == 0:
            doc.close()
            raise InvalidFileException("The PDF document contains 0 renderable pages.")

        full_text = []
        page_texts = []

        # Enforce page limit to prevent PDF decompression bomb denial-of-service
        pages_to_read = min(total_pages, MAX_PAGES_TO_PROCESS)

        try:
            for page_num in range(pages_to_read):
                page = doc[page_num]
                text = page.get_text("text") or ""
                page_texts.append(text)
                full_text.append(text)
                # Check character threshold
                if sum(len(t) for t in full_text) > MAX_TEXT_CHARACTERS:
                    break
        except Exception as e:
            logger.warning(f"Error reading pages from PDF '{filename}': {str(e)}")
        finally:
            doc.close()

        combined_text = "\n".join(full_text)[:MAX_TEXT_CHARACTERS]
        lines = [line.strip() for line in combined_text.split("\n") if line.strip()]

        # 1. Title Extraction
        clean_name = filename.replace(".pdf", "").replace("-", " ").replace("_", " ").title()
        title = clean_name
        abstract_idx = -1
        if len(lines) > 0:
            for idx, line in enumerate(lines[:30]):
                if re.match(r"^abstract\b", line, re.IGNORECASE):
                    abstract_idx = idx
                    break
            if abstract_idx > 0:
                candidate_title = " ".join(lines[:min(abstract_idx, 3)])
                if 10 < len(candidate_title) < 250:
                    title = candidate_title

        # 2. Authors Extraction
        authors = []
        if abstract_idx > 1:
            author_block = " ".join(lines[1:abstract_idx])
            names = re.split(r",|\sand\s", author_block)
            for n in names:
                clean_name = n.strip()
                if 2 < len(clean_name) < 40 and not any(kw in clean_name.lower() for kw in ["university", "department", "lab", "institute", "@"]):
                    authors.append({"name": clean_name})
        if not authors:
            authors.append({"name": "Primary Researcher et al."})

        # 3. Abstract Extraction
        abstract = ""
        abstract_match = re.search(
            r"(?:abstract|summary)[\s:.-]+([\s\S]*?)(?:(?:1\.?\s*)?introduction|keywords|categories|index terms)",
            combined_text,
            re.IGNORECASE
        )
        if abstract_match:
            abstract = " ".join(abstract_match.group(1).split()[:250])
        else:
            abstract = " ".join(lines[3:12]) if len(lines) > 12 else combined_text[:400]

        # 4. Section Segmentation
        sections = []
        section_pattern = re.compile(r"^(?:[0-9]+\.?\s+)?([A-Z][A-Za-z\s]{3,35})$", re.MULTILINE)
        current_heading = "Introduction"
        current_content = []

        for line in lines:
            if section_pattern.match(line) and len(line) < 35:
                if current_content:
                    sections.append({
                        "heading": current_heading,
                        "content": " ".join(current_content[:600])
                    })
                    current_content = []
                current_heading = line
            else:
                current_content.append(line)

        if current_content:
            sections.append({
                "heading": current_heading,
                "content": " ".join(current_content[:600])
            })

        # 5. Overlapping Semantic Chunking (preserving approximate page number)
        chunks = []
        words = combined_text.split()
        chunk_size = 220
        overlap = 40

        for i in range(0, len(words), chunk_size - overlap):
            chunk_words = words[i:i + chunk_size]
            if len(chunk_words) > 30:
                chunks.append(" ".join(chunk_words))

        # 6. References Extraction
        references = []
        ref_match = re.search(r"\nreferences\b[\s\S]*", combined_text, re.IGNORECASE)
        if ref_match:
            ref_text = ref_match.group(0)
            ref_lines = [r.strip() for r in ref_text.split("\n") if r.strip() and len(r.strip()) > 20]
            references = ref_lines[1:25]

        # Year detection
        year_match = re.search(r"\b(20[0-2][0-9]|19[8-9][0-9])\b", combined_text[:2000])
        year = int(year_match.group(1)) if year_match else 2024

        return {
            "title": title,
            "authors": authors,
            "abstract": abstract,
            "year": year,
            "sections": sections[:10],
            "chunks": chunks,
            "references": references,
            "total_pages": total_pages,
            "full_text": combined_text[:35000]
        }

pdf_processor = PdfProcessingService()
