import os
from PIL import Image, ImageDraw, ImageFont

def draw_rounded_card(draw, bbox, bg_color, border_color, radius=12, border_width=2):
    x0, y0, x1, y1 = bbox
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=bg_color, outline=border_color, width=border_width)

def draw_arrow(draw, start, end, color="#6366f1", width=3):
    x0, y0 = start
    x1, y1 = end
    draw.line([x0, y0, x1, y1], fill=color, width=width)
    # Draw arrow head
    if y1 > y0: # downward arrow
        draw.polygon([(x1, y1), (x1 - 6, y1 - 10), (x1 + 6, y1 - 10)], fill=color)
    elif y1 < y0: # upward arrow
        draw.polygon([(x1, y1), (x1 - 6, y1 + 10), (x1 + 6, y1 + 10)], fill=color)
    elif x1 > x0: # rightward arrow
        draw.polygon([(x1, y1), (x1 - 10, y1 - 6), (x1 - 10, y1 + 6)], fill=color)
    elif x1 < x0: # leftward arrow
        draw.polygon([(x1, y1), (x1 + 10, y1 - 6), (x1 + 10, y1 + 6)], fill=color)

def generate_diagram(output_path: str):
    width, height = 1240, 740
    img = Image.new("RGB", (width, height), color="#f8fafc")
    draw = ImageDraw.Draw(img)

    # Fonts
    font_dir = "C:/Windows/Fonts/"
    font_title = ImageFont.truetype(os.path.join(font_dir, "segoeuib.ttf"), 22)
    font_subtitle = ImageFont.truetype(os.path.join(font_dir, "segoeui.ttf"), 12)
    font_tier_title = ImageFont.truetype(os.path.join(font_dir, "segoeuib.ttf"), 14)
    font_box_title = ImageFont.truetype(os.path.join(font_dir, "segoeuib.ttf"), 12)
    font_text = ImageFont.truetype(os.path.join(font_dir, "segoeui.ttf"), 10)
    font_code = ImageFont.truetype(os.path.join(font_dir, "consola.ttf"), 9)

    # 1. Header Banner
    draw_rounded_card(draw, (30, 20, 1210, 85), "#ffffff", "#e2e8f0", radius=10, border_width=1)
    draw.text((50, 32), "ResearchRabbit AI • Hybrid Federated-Local Layered Architecture", font=font_title, fill="#0f172a")
    draw.text((50, 60), "Official System Blueprint: Client SPA ➔ Asynchronous Gateway ➔ Federated Scholarly Ingestion ➔ Local Vector & Relational Storage", font=font_subtitle, fill="#64748b")

    # 2. Tier 1: Client Presentation Layer (Top)
    draw_rounded_card(draw, (30, 105, 1210, 225), "#ffffff", "#818cf8", radius=12, border_width=2)
    # Header tag
    draw.rectangle([45, 115, 360, 137], fill="#4f46e5")
    draw.text((55, 118), "TIER 1: CLIENT PRESENTATION LAYER (SPA)", font=font_tier_title, fill="#ffffff")

    # Boxes inside Tier 1
    # Box 1A
    draw_rounded_card(draw, (50, 147, 320, 215), "#f5f3ff", "#c7d2fe", radius=8, border_width=1)
    draw.text((60, 155), "React 19 + TypeScript + Vite", font=font_box_title, fill="#312e81")
    draw.text((60, 175), "• Sub-second HMR compilation\n• Strict end-to-end type safety\n• Warm neutral light SaaS canvas", font=font_text, fill="#475569")

    # Box 1B
    draw_rounded_card(draw, (335, 147, 605, 215), "#f5f3ff", "#c7d2fe", radius=8, border_width=1)
    draw.text((345, 155), "Zustand State & TanStack Query", font=font_box_title, fill="#312e81")
    draw.text((345, 175), "• Central reactive paper basket\n• Active collection & search filters\n• Automatic API cache invalidation", font=font_text, fill="#475569")

    # Box 1C
    draw_rounded_card(draw, (620, 147, 905, 215), "#f5f3ff", "#c7d2fe", radius=8, border_width=1)
    draw.text((630, 155), "D3.js & React Flow Graph Engine", font=font_box_title, fill="#312e81")
    draw.text((630, 175), "• Interactive force physics network\n• Chronological card DAG layout\n• Ancestor & descendant traversal", font=font_text, fill="#475569")

    # Box 1D
    draw_rounded_card(draw, (920, 147, 1190, 215), "#f5f3ff", "#c7d2fe", radius=8, border_width=1)
    draw.text((930, 155), "AI Research Assistant UI", font=font_box_title, fill="#312e81")
    draw.text((930, 175), "• Untruncated Synthesis Context tray\n• 4 Strategy selectors (Comp/Method)\n• Evidence-grounded Q&A chat", font=font_text, fill="#475569")

    # Arrow from Tier 1 to Tier 2
    draw_arrow(draw, (620, 225), (620, 255), color="#4f46e5", width=3)
    draw.text((630, 233), "REST HTTP / JSON / Non-Blocking Asynchronous Sockets (Port 8000)", font=font_code, fill="#4338ca")

    # 3. Tier 2: API Gateway & Orchestration (Middle)
    draw_rounded_card(draw, (30, 255, 1210, 375), "#ffffff", "#475569", radius=12, border_width=2)
    draw.rectangle([45, 265, 360, 287], fill="#1e293b")
    draw.text((55, 268), "TIER 2: ASYNCHRONOUS API GATEWAY", font=font_tier_title, fill="#ffffff")

    # Box 2A
    draw_rounded_card(draw, (50, 297, 410, 365), "#f8fafc", "#cbd5e1", radius=8, border_width=1)
    draw.text((60, 305), "FastAPI + Starlette + Python 3.11", font=font_box_title, fill="#0f172a")
    draw.text((60, 325), "• Native async/await high concurrency\n• Uvicorn ASGI server with zero thread blocking\n• Modular routers: /search, /graph, /collections", font=font_text, fill="#475569")

    # Box 2B
    draw_rounded_card(draw, (425, 297, 785, 365), "#f8fafc", "#cbd5e1", radius=8, border_width=1)
    draw.text((435, 305), "Pydantic v2 Schema Enforcement", font=font_box_title, fill="#0f172a")
    draw.text((435, 325), "• Strict request/response data contracts\n• Automatic validation for paper/citation payloads\n• Zero runtime schema mismatches", font=font_text, fill="#475569")

    # Box 2C
    draw_rounded_card(draw, (800, 297, 1190, 365), "#f8fafc", "#cbd5e1", radius=8, border_width=1)
    draw.text((810, 305), "Security & Rate Limiting Guardrails", font=font_box_title, fill="#0f172a")
    draw.text((810, 325), "• Sliding-window rate limiter (120 req/min)\n• Regex directory path traversal sanitization\n• 100% parameterized SQLAlchemy SQL injection defense", font=font_text, fill="#475569")

    # Arrows splitting from Tier 2 to Tier 3A (Left) and Tier 3B (Right)
    draw_arrow(draw, (350, 375), (350, 405), color="#059669", width=3)
    draw_arrow(draw, (870, 375), (870, 405), color="#d97706", width=3)

    # 4. Tier 3A: Federated Academic Ingestion (Left)
    draw_rounded_card(draw, (30, 405, 595, 535), "#ffffff", "#10b981", radius=12, border_width=2)
    draw.rectangle([45, 415, 380, 437], fill="#065f46")
    draw.text((55, 418), "TIER 3A: FEDERATED ACADEMIC DISCOVERY", font=font_tier_title, fill="#ffffff")

    draw_rounded_card(draw, (45, 447, 580, 525), "#ecfdf5", "#a7f3d0", radius=8, border_width=1)
    draw.text((55, 455), "Live Federated Repositories (250M+ Works)", font=font_box_title, fill="#064e3b")
    draw.text((55, 473), "• OpenAlex API: 250M+ works, institutions, citation counts\n• arXiv API: 2.4M+ preprints in CS, Physics, Math, Biology\n• Semantic Scholar: TLDRs and citation graph expansions\n• Crossref DOI Registry: Authoritative publisher verification\n• Deduplication: SHA-256 title hashes & Levenshtein matching", font=font_text, fill="#047857")

    # 5. Tier 3B: Document Intelligence Pipeline (Right)
    draw_rounded_card(draw, (625, 405, 1210, 535), "#ffffff", "#f59e0b", radius=12, border_width=2)
    draw.rectangle([640, 415, 980, 437], fill="#b45309")
    draw.text((650, 418), "TIER 3B: DOCUMENT INTELLIGENCE PIPELINE", font=font_tier_title, fill="#ffffff")

    draw_rounded_card(draw, (640, 447, 1195, 525), "#fffbeb", "#fde68a", radius=8, border_width=1)
    draw.text((650, 455), "PyMuPDF High-Speed Document Extraction", font=font_box_title, fill="#78350f")
    draw.text((650, 473), "• Magic-byte verification (%PDF-) blocking malicious files\n• C++ PyMuPDF parser extracting multi-column academic text\n• Sliding-window chunker (500 tokens / 50 overlap)\n• Reference parser extracting bibliography for graph linkage\n• Background worker daemon streaming 0-100% job progress", font=font_text, fill="#92400e")

    # Arrows converging to Tier 4 (Bottom)
    draw_arrow(draw, (312, 535), (312, 565), color="#059669", width=3)
    draw_arrow(draw, (917, 535), (917, 565), color="#d97706", width=3)

    # 6. Tier 4: Local Storage & Intelligence (Bottom)
    draw_rounded_card(draw, (30, 565, 1210, 715), "#ffffff", "#0284c7", radius=12, border_width=2)
    draw.rectangle([45, 575, 460, 597], fill="#0369a1")
    draw.text((55, 578), "TIER 4: LOCAL-FIRST STORAGE & PRIVACY ENGINE", font=font_tier_title, fill="#ffffff")

    # Box 4A
    draw_rounded_card(draw, (50, 607, 410, 705), "#f0f9ff", "#bae6fd", radius=8, border_width=1)
    draw.text((60, 615), "SQLite Database (WAL Mode)", font=font_box_title, fill="#075985")
    draw.text((60, 635), "• PRAGMA journal_mode=WAL enables concurrent reads/writes\n• Normalised relational schema: papers, authors, citations\n• Real-time audit telemetry logging (user_activities table)\n• Zero external cloud database costs or server requirements", font=font_text, fill="#0369a1")

    # Box 4B
    draw_rounded_card(draw, (425, 607, 785, 705), "#f0f9ff", "#bae6fd", radius=8, border_width=1)
    draw.text((435, 615), "Qdrant Vector Database Engine", font=font_box_title, fill="#075985")
    draw.text((435, 635), "• 384-dimensional dense semantic embeddings\n• HNSW graph indexing for sub-10ms nearest-neighbor search\n• Metadata payload filtering (by collection, year, paperId)\n• Resilient fallback: in-memory cosine matrix if daemon offline", font=font_text, fill="#0369a1")

    # Box 4C
    draw_rounded_card(draw, (800, 607, 1190, 705), "#f0f9ff", "#bae6fd", radius=8, border_width=1)
    draw.text((810, 615), "Local Ollama LLM + Zero Hallucination RAG", font=font_box_title, fill="#075985")
    draw.text((810, 635), "• Pluggable local LLM (Llama 3, Mistral 7B) on local REST port\n• Strict citation anchor prompt constraint ([Vaswani2017])\n• 100% Privacy-First: unpublished drafts never leave laptop\n• Zero data egress to third-party proprietary training clouds", font=font_text, fill="#0369a1")

    img.save(output_path, "PNG", dpi=(150, 150))
    print(f"Architecture diagram generated: {output_path}")

if __name__ == '__main__':
    artifact_dir = r"C:\Users\akhya\.gemini\antigravity\brain\14cdbb73-a00c-4914-878b-f01beb6e823f"
    out_path = os.path.join(artifact_dir, "architecture_diagram.png")
    generate_diagram(out_path)
    # Also save in root
    generate_diagram("architecture_diagram.png")
