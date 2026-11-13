import re
from typing import Dict, Any, List
import fitz  # PyMuPDF

class PdfProcessingService:
    def parse_pdf(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Parses PDF using PyMuPDF (fitz), extracts structured metadata,
        sections, and semantic overlapping chunks for vector embedding.
        """
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        total_pages = len(doc)

        full_text = []
        page_texts = []

        for page_num in range(total_pages):
            page = doc[page_num]
            text = page.get_text("text")
            page_texts.append(text)
            full_text.append(text)

        combined_text = "\n".join(full_text)
        lines = [line.strip() for line in combined_text.split("\n") if line.strip()]

        # 1. Title Extraction
        title = filename.replace(".pdf", "").replace("-", " ").replace("_", " ").title()
        if len(lines) > 0:
            abstract_idx = -1
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
            abstract = " ".join(lines[1:12]) if len(lines) > 1 else combined_text[:400]

        # 4. Section Detection
        standard_sections = [
            "Introduction", "Related Work", "Background", "Methodology", "Methods",
            "Architecture", "Experiments", "Results", "Discussion", "Conclusion",
            "Future Work", "References"
        ]
        section_pattern = re.compile(
            rf"(?:^|\n)\s*(?:\d+\.?\s*)?({'|'.join(standard_sections)})\b",
            re.IGNORECASE
        )

        sections: List[Dict[str, str]] = []
        matches = list(section_pattern.finditer(combined_text))

        for i, m in enumerate(matches):
            heading = m.group(1).title()
            start = m.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(combined_text)
            content = combined_text[start:end].strip()
            if len(content) > 40:
                sections.append({
                    "title": heading,
                    "content": " ".join(content.split()[:800])
                })

        if not sections:
            sections.append({
                "title": "Document Content",
                "content": " ".join(combined_text.split()[:1500])
            })

        # 5. References Extraction
        references = []
        ref_match = re.search(r"(?:references|bibliography)[\s\S]*$", combined_text, re.IGNORECASE)
        if ref_match:
            ref_lines = [l.strip() for l in ref_match.group(0).split("\n") if len(l.strip()) > 15]
            for l in ref_lines[1:20]:
                cleaned_ref = re.sub(r"^\[\d+\]\s*", "", l)
                references.append(cleaned_ref)

        # 6. Semantic Chunking with Overlap (for Qdrant vector indexing)
        chunks = self.chunk_text(combined_text, chunk_size=400, overlap=50)

        # Year detection
        year_match = re.search(r"\b(20[0-2]\d)\b", combined_text)
        year = int(year_match.group(1)) if year_match else 2024

        doc.close()

        return {
            "title": title,
            "authors": authors,
            "abstract": abstract,
            "year": year,
            "sections": sections,
            "references": references,
            "chunks": chunks,
            "full_text": combined_text[:30000]
        }

    def chunk_text(self, text: str, chunk_size: int = 400, overlap: int = 50) -> List[str]:
        words = text.split()
        if not words:
            return []

        chunks = []
        i = 0
        while i < len(words):
            chunk = " ".join(words[i : i + chunk_size])
            chunks.append(chunk)
            i += (chunk_size - overlap)
        return chunks

pdf_service = PdfProcessingService()
