from typing import List, Dict, Any, Optional
from backend.app.services.qdrant_service import qdrant_service
from backend.app.services.embeddings.embedding_service import embedding_service
from backend.app.models import Paper

class HybridRetriever:
    """
    Hybrid Retrieval Engine combining:
    1. Dense semantic search via Qdrant vector store
    2. Lexical keyword retrieval across paper titles and abstracts
    3. Reciprocal Rank Fusion (RRF) for robust relevance ranking
    """
    def __init__(self, rrf_k: int = 60):
        self.rrf_k = rrf_k

    async def search(
        self,
        query: str,
        local_papers: List[Paper],
        limit: int = 20,
        filter_paper_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        clean_q = query.strip()
        if not clean_q:
            return []

        # 1. Dense Semantic Vector Search
        query_vector = await embedding_service.embed_query(clean_q)
        dense_results = qdrant_service.search_similar(
            query_vector=query_vector,
            limit=limit * 2,
            filter_paper_ids=filter_paper_ids
        )

        dense_rankings: Dict[str, int] = {}
        dense_scores: Dict[str, float] = {}
        for rank, hit in enumerate(dense_results):
            pid = hit.get("paper_id")
            if pid and pid not in dense_rankings:
                dense_rankings[pid] = rank + 1
                dense_scores[pid] = hit.get("score", 0.0)

        # 2. Lexical Keyword Search
        q_tokens = [w.lower() for w in clean_q.split() if len(w) > 2]
        lexical_matches = []
        for p in local_papers:
            if filter_paper_ids and p.id not in filter_paper_ids:
                continue
            text = f"{p.title} {p.abstract or ''}".lower()
            score = 0
            for tok in q_tokens:
                if tok in p.title.lower():
                    score += 3  # Higher weight for title match
                if tok in text:
                    score += 1
            if score > 0:
                lexical_matches.append((p.id, score))

        lexical_matches.sort(key=lambda x: x[1], reverse=True)
        lexical_rankings: Dict[str, int] = {pid: rank + 1 for rank, (pid, _) in enumerate(lexical_matches)}

        # 3. Reciprocal Rank Fusion (RRF)
        all_paper_ids = set(dense_rankings.keys()).union(set(lexical_rankings.keys()))
        rrf_scores: Dict[str, float] = {}

        for pid in all_paper_ids:
            score = 0.0
            if pid in dense_rankings:
                score += 1.0 / (self.rrf_k + dense_rankings[pid])
            if pid in lexical_rankings:
                score += 1.0 / (self.rrf_k + lexical_rankings[pid])
            rrf_scores[pid] = score

        # Sort paper IDs by RRF score
        ranked_ids = sorted(rrf_scores.keys(), key=lambda pid: rrf_scores[pid], reverse=True)[:limit]

        # Assemble final result dictionaries
        paper_lookup = {p.id: p for p in local_papers}
        fused_results = []

        for pid in ranked_ids:
            paper_obj = paper_lookup.get(pid)
            if paper_obj:
                fused_results.append({
                    "paper_id": pid,
                    "rrf_score": rrf_scores[pid],
                    "semantic_score": dense_scores.get(pid, 0.0),
                    "paper": paper_obj
                })

        return fused_results

hybrid_retriever = HybridRetriever()
