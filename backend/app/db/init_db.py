import re
from datetime import datetime, timezone
from backend.app.db.database import Base, engine, SessionLocal
from backend.app.db.models import (
    User,
    Paper,
    Author,
    PaperAuthor,
    Citation,
    ResearchTopic,
    PaperTopic,
    Collection,
    CollectionPaper
)
from backend.app.core.security import get_password_hash
from backend.app.services.paper_deduplication import normalize_title

SEED_PAPERS = [
    {
        "id": "paper-vaswani-2017",
        "title": "Attention Is All You Need",
        "authors": [
            {"name": "Ashish Vaswani", "affiliation": "Google Brain"},
            {"name": "Noam Shazeer", "affiliation": "Google Brain"},
            {"name": "Niki Parmar", "affiliation": "Google Research"},
            {"name": "Jakob Uszkoreit", "affiliation": "Google Research"},
            {"name": "Llion Jones", "affiliation": "Google Research"},
            {"name": "Aidan N. Gomez", "affiliation": "University of Toronto"},
            {"name": "Lukasz Kaiser", "affiliation": "Google Brain"},
            {"name": "Illia Polosukhin", "affiliation": "Independent"}
        ],
        "abstract": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.",
        "year": 2017,
        "venue": "NeurIPS 2017",
        "arxiv_id": "1706.03762",
        "doi": "10.48550/arXiv.1706.03762",
        "citation_count": 135400,
        "reference_count": 42,
        "influential_citation_count": 18200,
        "fields_of_study": ["Computer Science", "Artificial Intelligence", "Natural Language Processing"],
        "open_access_pdf_url": "https://arxiv.org/pdf/1706.03762.pdf",
        "tldr": "Introduces the Transformer architecture based entirely on self-attention mechanisms, replacing recurrent networks in sequence transduction.",
        "source": "local",
        "reading_status": "starred",
        "user_rating": 5,
        "tags": ["Transformer", "NLP", "Foundational", "Attention"],
        "references_list": ["paper-devlin-2018", "paper-brown-2020"]
    },
    {
        "id": "paper-devlin-2018",
        "title": "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
        "authors": [
            {"name": "Jacob Devlin", "affiliation": "Google AI Language"},
            {"name": "Ming-Wei Chang", "affiliation": "Google AI Language"},
            {"name": "Kenton Lee", "affiliation": "Google AI Language"},
            {"name": "Kristina Toutanova", "affiliation": "Google AI Language"}
        ],
        "abstract": "We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers. As a result, the pre-trained BERT model can be fine-tuned with just one additional output layer to create state-of-the-art models for a wide range of tasks, such as question answering and language inference.",
        "year": 2018,
        "venue": "NAACL 2019",
        "arxiv_id": "1810.04805",
        "doi": "10.18653/v1/N19-1423",
        "citation_count": 104200,
        "reference_count": 47,
        "influential_citation_count": 12400,
        "fields_of_study": ["Computer Science", "Artificial Intelligence", "Natural Language Processing"],
        "open_access_pdf_url": "https://arxiv.org/pdf/1810.04805.pdf",
        "tldr": "Introduces BERT, using masked language modeling to pre-train deep bidirectional representations yielding breakthrough NLP benchmark performance.",
        "source": "local",
        "reading_status": "completed",
        "user_rating": 5,
        "tags": ["BERT", "Transformers", "Pretraining", "Bidirectional"],
        "references_list": ["paper-vaswani-2017"]
    },
    {
        "id": "paper-brown-2020",
        "title": "Language Models are Few-Shot Learners (GPT-3)",
        "authors": [
            {"name": "Tom B. Brown", "affiliation": "OpenAI"},
            {"name": "Benjamin Mann", "affiliation": "OpenAI"},
            {"name": "Nick Ryder", "affiliation": "OpenAI"},
            {"name": "Melanie Subbiah", "affiliation": "OpenAI"},
            {"name": "Jared Kaplan", "affiliation": "Johns Hopkins University"},
            {"name": "Dario Amodei", "affiliation": "OpenAI"}
        ],
        "abstract": "Recent work has demonstrated substantial gains on many NLP tasks and benchmarks by pre-training on a large corpus of text followed by fine-tuning on a specific task. While typically task-agnostic in architecture, this method still requires task-specific fine-tuning datasets of thousands or tens of thousands of examples. Here we show that scaling up language models greatly improves task-agnostic, few-shot performance, sometimes even reaching competitiveness with prior state-of-the-art fine-tuning approaches.",
        "year": 2020,
        "venue": "NeurIPS 2020",
        "arxiv_id": "2005.14165",
        "doi": "10.48550/arXiv.2005.14165",
        "citation_count": 42100,
        "reference_count": 78,
        "influential_citation_count": 6800,
        "fields_of_study": ["Computer Science", "Artificial Intelligence", "Large Language Models"],
        "open_access_pdf_url": "https://arxiv.org/pdf/2005.14165.pdf",
        "tldr": "Demonstrates that massive 175B parameter language models achieve competitive few-shot NLP capabilities without gradient fine-tuning.",
        "source": "local",
        "reading_status": "completed",
        "user_rating": 5,
        "tags": ["GPT-3", "LLM", "Few-Shot", "Scaling"],
        "references_list": ["paper-vaswani-2017"]
    },
    {
        "id": "paper-lewis-2020",
        "title": "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
        "authors": [
            {"name": "Patrick Lewis", "affiliation": "Facebook AI Research"},
            {"name": "Ethan Perez", "affiliation": "NYU"},
            {"name": "Aleksandra Piktus", "affiliation": "Facebook AI Research"},
            {"name": "Fabio Petroni", "affiliation": "Facebook AI Research"},
            {"name": "Vladimir Karpukhin", "affiliation": "Facebook AI Research"},
            {"name": "Naman Goyal", "affiliation": "Facebook AI Research"},
            {"name": "Heinrich Küttler", "affiliation": "Facebook AI Research"},
            {"name": "Mike Lewis", "affiliation": "Facebook AI Research"},
            {"name": "Wen-tau Yih", "affiliation": "Facebook AI Research"},
            {"name": "Tim Rocktäschel", "affiliation": "UCL"},
            {"name": "Sebastian Riedel", "affiliation": "Facebook AI Research"},
            {"name": "Douwe Kiela", "affiliation": "Facebook AI Research"}
        ],
        "abstract": "Large pre-trained language models have been shown to store factual knowledge in their parameters, and achieve state-of-the-art results when fine-tuned on downstream NLP tasks. However, their ability to access and precisely manipulate knowledge is still limited, and in knowledge-intensive tasks, their performance lags behind task-specific architectures. We explore a general-purpose fine-tuning recipe for retrieval-augmented generation (RAG) — models which combine pre-trained parametric and non-parametric memory for language generation.",
        "year": 2020,
        "venue": "NeurIPS 2020",
        "arxiv_id": "2005.11401",
        "doi": "10.48550/arXiv.2005.11401",
        "citation_count": 14200,
        "reference_count": 55,
        "influential_citation_count": 2100,
        "fields_of_study": ["Computer Science", "Information Retrieval", "Natural Language Processing"],
        "open_access_pdf_url": "https://arxiv.org/pdf/2005.11401.pdf",
        "tldr": "Introduces RAG, merging dense vector retrieval with sequence-to-sequence generators to reduce hallucinations and ground knowledge-intensive tasks.",
        "source": "local",
        "reading_status": "reading",
        "user_rating": 5,
        "tags": ["RAG", "Dense Retrieval", "Hallucination Reduction"],
        "references_list": ["paper-vaswani-2017"]
    },
    {
        "id": "paper-rombach-2022",
        "title": "High-Resolution Image Synthesis with Latent Diffusion Models",
        "authors": [
            {"name": "Robin Rombach", "affiliation": "LMU Munich"},
            {"name": "Andreas Blattmann", "affiliation": "LMU Munich"},
            {"name": "Dominik Lorenz", "affiliation": "LMU Munich"},
            {"name": "Patrick Esser", "affiliation": "Runway"},
            {"name": "Björn Ommer", "affiliation": "LMU Munich"}
        ],
        "abstract": "By decomposing the image formation process into a sequential application of denoising autoencoders, diffusion models achieve state-of-the-art synthesis results on image data and beyond. To enable DM training on limited computational resources while retaining their quality and flexibility, we apply them in the latent space of powerful pretrained autoencoders. By introducing cross-attention layers into the model architecture, we turn diffusion models into powerful and flexible generators for general conditioning inputs such as text or bounding boxes.",
        "year": 2022,
        "venue": "CVPR 2022",
        "arxiv_id": "2112.10752",
        "doi": "10.1109/CVPR52688.2022.01042",
        "citation_count": 24800,
        "reference_count": 94,
        "influential_citation_count": 4300,
        "fields_of_study": ["Computer Science", "Computer Vision", "Generative AI"],
        "open_access_pdf_url": "https://arxiv.org/pdf/2112.10752.pdf",
        "tldr": "Introduces Latent Diffusion Models (Stable Diffusion), operating diffusion in a lower-dimensional latent space to achieve high-resolution synthesis with computational efficiency.",
        "source": "local",
        "reading_status": "starred",
        "user_rating": 5,
        "tags": ["Diffusion", "Computer Vision", "Stable Diffusion", "Generative AI"],
        "references_list": ["paper-vaswani-2017"]
    }
]

def init_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Admin User
        admin = db.query(User).filter(User.email == "researcher@example.com").first()
        if not admin:
            admin = User(
                id="user-demo-researcher",
                email="researcher@example.com",
                hashed_password=get_password_hash("ResearchPass2026!"),
                full_name="Dr. Elena Vance",
                institution="Institute for Advanced Research",
                is_active=True
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        # 2. Seed Papers & Populate Normalized Tables
        for p_data in SEED_PAPERS:
            norm_title = normalize_title(p_data["title"])
            paper = db.query(Paper).filter(Paper.id == p_data["id"]).first()
            if not paper:
                paper = Paper(
                    id=p_data["id"],
                    title=p_data["title"],
                    title_normalized=norm_title,
                    authors=p_data["authors"],
                    abstract=p_data["abstract"],
                    year=p_data["year"],
                    venue=p_data.get("venue"),
                    arxiv_id=p_data.get("arxiv_id"),
                    doi=p_data.get("doi"),
                    citation_count=p_data["citation_count"],
                    reference_count=p_data["reference_count"],
                    influential_citation_count=p_data.get("influential_citation_count", 0),
                    fields_of_study=p_data["fields_of_study"],
                    open_access_pdf_url=p_data.get("open_access_pdf_url"),
                    tldr=p_data.get("tldr"),
                    source=p_data.get("source", "local"),
                    reading_status=p_data.get("reading_status", "to-read"),
                    user_rating=p_data.get("user_rating", 5),
                    tags=p_data.get("tags", []),
                    references_list=p_data.get("references_list", [])
                )
                db.add(paper)
                db.commit()
                db.refresh(paper)
            else:
                if not paper.title_normalized:
                    paper.title_normalized = norm_title
                    db.commit()

            # Normalized Authors & PaperAuthors
            for order, a_info in enumerate(p_data["authors"], start=1):
                a_name = a_info["name"].strip()
                norm_a_name = a_name.lower()
                author = db.query(Author).filter(Author.normalized_name == norm_a_name).first()
                if not author:
                    author = Author(
                        name=a_name,
                        normalized_name=norm_a_name,
                        affiliation=a_info.get("affiliation")
                    )
                    db.add(author)
                    db.commit()
                    db.refresh(author)

                link = db.query(PaperAuthor).filter(
                    PaperAuthor.paper_id == paper.id,
                    PaperAuthor.author_id == author.id
                ).first()
                if not link:
                    db.add(PaperAuthor(
                        paper_id=paper.id,
                        author_id=author.id,
                        author_order=order,
                        is_corresponding=(order == 1)
                    ))
                    db.commit()

            # Normalized ResearchTopics & PaperTopics
            for field in p_data["fields_of_study"]:
                f_name = field.strip()
                f_slug = re.sub(r"[^\w\s-]", "", f_name.lower()).replace(" ", "-")
                topic = db.query(ResearchTopic).filter(ResearchTopic.slug == f_slug).first()
                if not topic:
                    topic = ResearchTopic(name=f_name, slug=f_slug)
                    db.add(topic)
                    db.commit()
                    db.refresh(topic)

                pt_link = db.query(PaperTopic).filter(
                    PaperTopic.paper_id == paper.id,
                    PaperTopic.topic_id == topic.id
                ).first()
                if not pt_link:
                    db.add(PaperTopic(
                        paper_id=paper.id,
                        topic_id=topic.id,
                        confidence_score=1.0
                    ))
                    db.commit()

        # 3. Seed Normalized Citations
        for p_data in SEED_PAPERS:
            citing_id = p_data["id"]
            for ref_id in p_data.get("references_list", []):
                cited_paper = db.query(Paper).filter(Paper.id == ref_id).first()
                if cited_paper:
                    existing_cite = db.query(Citation).filter(
                        Citation.citing_paper_id == citing_id,
                        Citation.cited_paper_id == ref_id
                    ).first()
                    if not existing_cite:
                        db.add(Citation(
                            citing_paper_id=citing_id,
                            cited_paper_id=ref_id,
                            citation_context=f"Cites {cited_paper.title}",
                            is_influential=True
                        ))
                        db.commit()

        # 4. Seed Collections & Normalized CollectionPapers
        col1 = db.query(Collection).filter(Collection.id == "col-foundation-models").first()
        if not col1:
            col1 = Collection(
                id="col-foundation-models",
                name="Foundation Models & Transformer Architectures",
                description="Seminal papers on self-attention mechanisms, scaling laws, and generative representations.",
                color="#3b82f6",
                icon="Brain",
                owner_id=admin.id,
                share_token="share-col-foundation-models-2026"
            )
            db.add(col1)
            db.commit()

        col2 = db.query(Collection).filter(Collection.id == "col-multimodal-diffusion").first()
        if not col2:
            col2 = Collection(
                id="col-multimodal-diffusion",
                name="Multimodal AI & Latent Diffusion",
                description="Diffusion models and cross-attention conditional generation.",
                color="#8b5cf6",
                icon="Sparkles",
                owner_id=admin.id,
                share_token="share-col-multimodal-diffusion-2026"
            )
            db.add(col2)
            db.commit()

        # Populate CollectionPapers
        for pid in ["paper-vaswani-2017", "paper-devlin-2018", "paper-brown-2020", "paper-lewis-2020"]:
            existing_link = db.query(CollectionPaper).filter(
                CollectionPaper.collection_id == "col-foundation-models",
                CollectionPaper.paper_id == pid
            ).first()
            if not existing_link:
                db.add(CollectionPaper(
                    collection_id="col-foundation-models",
                    paper_id=pid,
                    notes="Foundational architecture study."
                ))
                db.commit()

        for pid in ["paper-rombach-2022"]:
            existing_link = db.query(CollectionPaper).filter(
                CollectionPaper.collection_id == "col-multimodal-diffusion",
                CollectionPaper.paper_id == pid
            ).first()
            if not existing_link:
                db.add(CollectionPaper(
                    collection_id="col-multimodal-diffusion",
                    paper_id=pid,
                    notes="Core latent diffusion formulation."
                ))
                db.commit()

    finally:
        db.close()

if __name__ == "__main__":
    init_database()
    print("Database schema and normalized records initialized successfully.")
