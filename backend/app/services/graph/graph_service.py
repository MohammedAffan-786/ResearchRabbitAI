from typing import Optional, List, Any, Dict
from sqlalchemy.orm import Session
from backend.app.models import Paper

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

class GraphService:
    def build_graph(
        self,
        db: Session,
        seeds: Optional[str] = None,
        min_year: Optional[int] = None,
        max_year: Optional[int] = None,
        link_type: str = "all",
        topic: Optional[str] = None,
        include_entities: bool = True
    ) -> Dict[str, Any]:
        all_papers = db.query(Paper).all()
        if min_year:
            all_papers = [p for p in all_papers if p.year >= min_year]
        if max_year:
            all_papers = [p for p in all_papers if p.year <= max_year]
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
        else:
            target_papers = all_papers[:12]

        if not target_papers and all_papers:
            target_papers = all_papers[:8]

        nodes = []
        links = []
        seen_nodes = set()
        seen_links = set()

        for p in target_papers:
            if p.id not in seen_nodes:
                seen_nodes.add(p.id)
                nodes.append({
                    "id": p.id,
                    "type": "paper",
                    "label": p.title,
                    "title": p.title,
                    "authors": [a.get("name") if isinstance(a, dict) else str(a) for a in (p.authors or [])],
                    "year": p.year,
                    "citations": p.citation_count,
                    "field": (p.fields_of_study or ["AI"])[0],
                    "group": get_field_group(p.fields_of_study),
                    "isSeed": p.id in seed_set,
                    "openAccess": bool(p.open_access_pdf_url)
                })

        # Citation Links
        if link_type in ["all", "cites", "citation"]:
            for p in target_papers:
                for ref_id in (p.references_list or []):
                    if ref_id in seen_nodes:
                        link_id = f"cite-{p.id}-{ref_id}"
                        if link_id not in seen_links:
                            seen_links.add(link_id)
                            links.append({
                                "id": link_id,
                                "source": p.id,
                                "target": ref_id,
                                "type": "cites",
                                "label": "Cites",
                                "strength": 1.0
                            })

        # Semantic Similarity Links
        if link_type in ["all", "semantic", "similar"]:
            generic_terms = {"computer science", "artificial intelligence", "preprint", "journal", "academic publication"}
            for i, p1 in enumerate(target_papers):
                for p2 in target_papers[i + 1:]:
                    f1 = {str(f).lower() for f in (p1.fields_of_study or []) if str(f).lower() not in generic_terms}
                    f2 = {str(f).lower() for f in (p2.fields_of_study or []) if str(f).lower() not in generic_terms}
                    shared_fields = f1.intersection(f2)
                    year_diff = abs(p1.year - p2.year)
                    if shared_fields and year_diff <= 3:
                        p1_sim_count = sum(1 for l in links if l.get("type") == "semantic" and (l["source"] == p1.id or l["target"] == p1.id))
                        p2_sim_count = sum(1 for l in links if l.get("type") == "semantic" and (l["source"] == p2.id or l["target"] == p2.id))
                        if p1_sim_count < 2 and p2_sim_count < 2:
                            link_id = f"sim-{p1.id}-{p2.id}"
                            if link_id not in seen_links and f"sim-{p2.id}-{p1.id}" not in seen_links:
                                seen_links.add(link_id)
                                links.append({
                                    "id": link_id,
                                    "source": p1.id,
                                    "target": p2.id,
                                    "type": "semantic",
                                    "label": f"Similar ({list(shared_fields)[0].title()})",
                                    "strength": 0.6
                                })

        # Author and Topic Entities
        if include_entities:
            author_count = 0
            for p in target_papers[:6]:
                for a in (p.authors or [])[:2]:
                    aname = a.get("name") if isinstance(a, dict) else str(a)
                    aid = f"author-{hash(aname) % 100000}"
                    if aid not in seen_nodes and author_count < 8:
                        seen_nodes.add(aid)
                        author_count += 1
                        nodes.append({
                            "id": aid,
                            "type": "author",
                            "label": aname,
                            "citations": p.citation_count,
                            "group": 7
                        })
                    if aid in seen_nodes and link_type in ["all", "author"]:
                        link_id = f"authored-{aid}-{p.id}"
                        if link_id not in seen_links:
                            seen_links.add(link_id)
                            links.append({
                                "id": link_id,
                                "source": aid,
                                "target": p.id,
                                "type": "authored",
                                "label": "Authored",
                                "strength": 0.8
                            })

        return {
            "nodes": nodes,
            "links": links,
            "seedPaperIds": list(seed_set),
            "stats": {
                "paperCount": len([n for n in nodes if n["type"] == "paper"]),
                "authorCount": len([n for n in nodes if n["type"] == "author"]),
                "citationEdges": len([l for l in links if l["type"] == "cites"]),
                "similarityEdges": len([l for l in links if l["type"] == "semantic"])
            }
        }

    def expand_node(self, db: Session, paper_id: str) -> Dict[str, Any]:
        paper = db.query(Paper).filter(Paper.id == paper_id).first()
        if not paper:
            return {"newNodes": [], "newLinks": []}

        all_papers = db.query(Paper).filter(Paper.id != paper_id).all()
        related = [p for p in all_papers if p.id in (paper.references_list or [])]
        if len(related) < 3:
            shared = [p for p in all_papers if any(f in (paper.fields_of_study or []) for f in (p.fields_of_study or []))]
            for s in shared[:3]:
                if s not in related:
                    related.append(s)

        new_nodes = []
        new_links = []
        for r in related[:4]:
            new_nodes.append({
                "id": r.id,
                "type": "paper",
                "label": r.title,
                "title": r.title,
                "authors": [a.get("name") if isinstance(a, dict) else str(a) for a in (r.authors or [])],
                "year": r.year,
                "citations": r.citation_count,
                "field": (r.fields_of_study or ["AI"])[0],
                "group": get_field_group(r.fields_of_study),
                "isSeed": False,
                "openAccess": bool(r.open_access_pdf_url)
            })
            new_links.append({
                "id": f"expand-link-{paper.id}-{r.id}",
                "source": paper.id,
                "target": r.id,
                "type": "cites" if r.id in (paper.references_list or []) else "semantic",
                "label": "References" if r.id in (paper.references_list or []) else "Discovered Relation",
                "strength": 0.8
            })

        return {"newNodes": new_nodes, "newLinks": new_links}

graph_service = GraphService()
