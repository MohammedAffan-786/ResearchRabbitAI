from typing import Optional, List, Any, Dict
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.db.models import Paper

router = APIRouter(prefix="/graph", tags=["Knowledge Graph"])

class ExpandNodeRequest(BaseModel):
    paperId: str

def get_field_group(fields: List[Any]) -> int:
    if not fields:
        return 6
    primary = str(fields[0]).lower()
    if "natural language" in primary or "nlp" in primary or "transformer" in primary:
        return 1
    if "vision" in primary or "image" in primary:
        return 2
    if "bio" in primary or "protein" in primary or "genetic" in primary:
        return 3
    if "quantum" in primary or "physic" in primary:
        return 4
    if "reinforcement" in primary or "rl" in primary:
        return 5
    return 6

@router.get("")
def get_graph(
    seeds: Optional[str] = None,
    minYear: Optional[int] = None,
    maxYear: Optional[int] = None,
    linkType: Optional[str] = Query("all", description="all, cites, semantic, author"),
    topic: Optional[str] = None,
    includeEntities: bool = Query(True, description="Include author and topic nodes"),
    db: Session = Depends(get_db)
):
    all_papers = db.query(Paper).all()
    if minYear:
        all_papers = [p for p in all_papers if p.year >= minYear]
    if maxYear:
        all_papers = [p for p in all_papers if p.year <= maxYear]
    if topic and topic != "all":
        topic_lower = topic.lower()
        all_papers = [
            p for p in all_papers
            if any(topic_lower in str(f).lower() for f in (p.fields_of_study or []))
        ]

    paper_map = {p.id: p for p in all_papers}
    seed_ids = [s.strip() for s in seeds.split(",")] if seeds else []
    seed_set = set(seed_ids)

    target_papers = []
    if seed_ids:
        for sid in seed_ids:
            if sid in paper_map and paper_map[sid] not in target_papers:
                target_papers.append(paper_map[sid])
                for ref in (paper_map[sid].references_list or []):
                    if ref in paper_map and paper_map[ref] not in target_papers:
                        target_papers.append(paper_map[ref])
        if len(target_papers) < 30:
            for p in all_papers:
                if p not in target_papers:
                    target_papers.append(p)
                    if len(target_papers) >= 30:
                        break
    else:
        target_papers = all_papers[:40]

    nodes: List[Dict[str, Any]] = [
        {
            "id": p.id,
            "title": p.title,
            "authors": [a.get("name", "Author") for a in (p.authors or [])],
            "year": p.year,
            "citations": p.citation_count,
            "fields": p.fields_of_study or [],
            "isSeed": p.id in seed_set,
            "isUploaded": p.source == "upload",
            "group": get_field_group(p.fields_of_study or []),
            "nodeType": "paper",
            "venue": p.venue or "Academic Publication"
        }
        for p in target_papers
    ]

    links: List[Dict[str, Any]] = []
    current_ids = set(n["id"] for n in nodes)

    # Citations (Direct, Verified Relationships)
    if linkType in ["all", "cites"]:
        for p1 in target_papers:
            for ref_id in (p1.references_list or []):
                if ref_id in current_ids and ref_id != p1.id:
                    links.append({
                        "id": f"link-{p1.id}-{ref_id}-cite",
                        "source": p1.id,
                        "target": ref_id,
                        "type": "cites",
                        "isVerifiedCitation": True,
                        "weight": 2.5,
                        "label": "Verified Citation"
                    })

    # Authors & Similarities
    for i in range(len(target_papers)):
        p1 = target_papers[i]
        for j in range(i + 1, len(target_papers)):
            p2 = target_papers[j]

            # Shared authors
            if linkType in ["all", "author"]:
                a1_names = {a.get("name", "").lower() for a in (p1.authors or []) if a.get("name")}
                a2_names = {a.get("name", "").lower() for a in (p2.authors or []) if a.get("name")}
                shared_a = a1_names.intersection(a2_names)
                if shared_a and not any("et al" in name for name in shared_a):
                    links.append({
                        "id": f"link-{p1.id}-{p2.id}-auth",
                        "source": p1.id,
                        "target": p2.id,
                        "type": "author_collaboration",
                        "isVerifiedCitation": False,
                        "weight": 2.0,
                        "label": f"Shared: {list(shared_a)[0].title()}"
                    })
                    continue

            # Semantic similarity
            if linkType in ["all", "semantic"]:
                generic_terms = {"computer science", "artificial intelligence", "preprint", "journal", "academic publication"}
                f1_set = {str(f).lower() for f in (p1.fields_of_study or []) if str(f).lower() not in generic_terms}
                f2_set = {str(f).lower() for f in (p2.fields_of_study or []) if str(f).lower() not in generic_terms}
                common_fields = f1_set.intersection(f2_set)
                
                # Check specific title keywords
                p1_words = {w for w in p1.title.lower().split() if len(w) > 4 and w not in ["model", "models", "using", "based", "neural", "learning"]}
                p2_words = {w for w in p2.title.lower().split() if len(w) > 4 and w not in ["model", "models", "using", "based", "neural", "learning"]}
                shared_words = p1_words.intersection(p2_words)

                p1_sim_count = sum(1 for l in links if l.get("type") == "semantic_similarity" and (l["source"] == p1.id or l["target"] == p1.id))
                p2_sim_count = sum(1 for l in links if l.get("type") == "semantic_similarity" and (l["source"] == p2.id or l["target"] == p2.id))

                if (common_fields or len(shared_words) >= 2) and p1_sim_count < 2 and p2_sim_count < 2:
                    label = list(common_fields)[0].title() if common_fields else "Semantic Similarity"
                    links.append({
                        "id": f"link-{p1.id}-{p2.id}-sim",
                        "source": p1.id,
                        "target": p2.id,
                        "type": "semantic_similarity",
                        "isVerifiedCitation": False,
                        "weight": 1.2,
                        "label": label
                    })

    # Optional Entity nodes: Topics
    if includeEntities and len(target_papers) <= 25:
        topic_counts: Dict[str, List[str]] = {}
        for p in target_papers:
            for f in (p.fields_of_study or []):
                fn = str(f).title().strip()
                if fn and fn not in ["Computer Science", "Preprint"]:
                    topic_counts.setdefault(fn, []).append(p.id)

        for top_name, pids in list(topic_counts.items())[:4]:
            if len(pids) >= 2:
                top_node_id = f"topic-{top_name.lower().replace(' ', '-')}"
                nodes.append({
                    "id": top_node_id,
                    "title": top_name,
                    "authors": [],
                    "year": 2024,
                    "citations": len(pids) * 10,
                    "fields": [top_name],
                    "isSeed": False,
                    "isUploaded": False,
                    "group": 0,
                    "nodeType": "topic"
                })
                for pid in pids:
                    links.append({
                        "id": f"link-{top_node_id}-{pid}",
                        "source": top_node_id,
                        "target": pid,
                        "type": "topic_membership",
                        "isVerifiedCitation": False,
                        "weight": 1.0,
                        "label": "Topic"
                    })

    return {
        "nodes": nodes,
        "links": links,
        "stats": {
            "nodeCount": len(nodes),
            "edgeCount": len(links),
            "verifiedCitations": sum(1 for l in links if l.get("type") == "cites"),
            "semanticSimilarities": sum(1 for l in links if l.get("type") == "semantic_similarity"),
            "collaborations": sum(1 for l in links if l.get("type") == "author_collaboration")
        }
    }

@router.post("/expand")
def expand_node(req: ExpandNodeRequest, db: Session = Depends(get_db)):
    all_papers = db.query(Paper).all()
    target = db.query(Paper).filter(Paper.id == req.paperId).first()
    if not target:
        return {"newNodes": [], "newLinks": []}

    neighbors = [p for p in all_papers if p.id != req.paperId][:5]
    new_nodes = [
        {
            "id": n.id,
            "title": n.title,
            "authors": [a.get("name") for a in (n.authors or [])],
            "year": n.year,
            "citations": n.citation_count,
            "fields": n.fields_of_study or [],
            "group": get_field_group(n.fields_of_study or []),
            "nodeType": "paper",
            "isSeed": False
        }
        for n in neighbors
    ]

    new_links = [
        {
            "id": f"expand-{req.paperId}-{n.id}",
            "source": req.paperId,
            "target": n.id,
            "type": "semantic_similarity",
            "isVerifiedCitation": False,
            "weight": 1.5,
            "label": "Semantic Connection"
        }
        for n in neighbors
    ]

    return {"newNodes": new_nodes, "newLinks": new_links}
