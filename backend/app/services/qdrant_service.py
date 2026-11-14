import os
import uuid
import math
from typing import List, Dict, Any, Optional
from backend.app.core.config import settings

# Attempt importing QdrantClient safely (handles environments where cygrpc.pyd is restricted by AppLocker/WDAC)
HAS_QDRANT = False
QdrantClient = None
rest_models = None

try:
    from qdrant_client import QdrantClient as _QdrantClient
    from qdrant_client.http import models as _rest_models
    QdrantClient = _QdrantClient
    rest_models = _rest_models
    HAS_QDRANT = True
except Exception as _e:
    print(f"[Qdrant] Native Qdrant client unavailable ({_e}). Initializing resilient in-memory vector store.")

def _cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm_a = math.sqrt(sum(a * a for a in v1))
    norm_b = math.sqrt(sum(b * b for b in v2))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)

class QdrantService:
    def __init__(self):
        self.collection_name = settings.QDRANT_COLLECTION_NAME
        self.client = None
        self._in_memory_points: List[Dict[str, Any]] = []
        
        if HAS_QDRANT and QdrantClient is not None:
            if settings.QDRANT_URL:
                try:
                    self.client = QdrantClient(
                        url=settings.QDRANT_URL,
                        api_key=settings.QDRANT_API_KEY or None,
                        timeout=15.0
                    )
                except Exception as e:
                    print(f"[Qdrant] Connection to URL failed ({e}), using in-memory vector store.")
            else:
                storage_path = os.path.abspath("./qdrant_storage")
                os.makedirs(storage_path, exist_ok=True)
                try:
                    self.client = QdrantClient(path=storage_path)
                except Exception as e:
                    print(f"[Qdrant] Local path locked ({e}), using in-memory vector client.")
                    try:
                        self.client = QdrantClient(location=":memory:")
                    except Exception:
                        self.client = None

    def init_collection(self, vector_size: int = 768):
        if self.client and HAS_QDRANT and rest_models is not None:
            try:
                collections = self.client.get_collections().collections
                exists = any(c.name == self.collection_name for c in collections)
                if not exists:
                    self.client.create_collection(
                        collection_name=self.collection_name,
                        vectors_config=rest_models.VectorParams(
                            size=vector_size,
                            distance=rest_models.Distance.COSINE
                        )
                    )
            except Exception as e:
                print(f"[Qdrant] Collection init note: {e}")
        else:
            print("[Qdrant] In-memory vector collection initialized.")

    async def upsert_paper_chunks(
        self,
        paper_id: str,
        chunks: List[str],
        vectors: List[List[float]],
        metadatas: Optional[List[Dict[str, Any]]] = None
    ):
        if self.client and HAS_QDRANT and rest_models is not None:
            points = []
            for i, (chunk, vec) in enumerate(zip(chunks, vectors)):
                point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{paper_id}_{i}"))
                payload = {
                    "paper_id": paper_id,
                    "chunk_index": i,
                    "text": chunk
                }
                if metadatas and i < len(metadatas):
                    payload.update(metadatas[i])

                points.append(
                    rest_models.PointStruct(
                        id=point_id,
                        vector=vec,
                        payload=payload
                    )
                )

            if points:
                self.client.upsert(
                    collection_name=self.collection_name,
                    points=points
                )
        else:
            # In-memory vector upsert
            for i, (chunk, vec) in enumerate(zip(chunks, vectors)):
                point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{paper_id}_{i}"))
                payload = {
                    "paper_id": paper_id,
                    "chunk_index": i,
                    "text": chunk
                }
                if metadatas and i < len(metadatas):
                    payload.update(metadatas[i])

                # Replace or add point
                self._in_memory_points = [p for p in self._in_memory_points if p["id"] != point_id]
                self._in_memory_points.append({
                    "id": point_id,
                    "vector": vec,
                    "payload": payload
                })

    async def search(
        self,
        query_vector: List[float],
        limit: int = 8,
        paper_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        if self.client and HAS_QDRANT and rest_models is not None:
            query_filter = None
            if paper_ids and len(paper_ids) > 0:
                query_filter = rest_models.Filter(
                    must=[
                        rest_models.FieldCondition(
                            key="paper_id",
                            match=rest_models.MatchAny(any=paper_ids)
                        )
                    ]
                )

            try:
                if hasattr(self.client, "query_points"):
                    response = self.client.query_points(
                        collection_name=self.collection_name,
                        query=query_vector,
                        limit=limit,
                        query_filter=query_filter,
                        with_payload=True
                    )
                    results = response.points
                elif hasattr(self.client, "search"):
                    results = self.client.search(
                        collection_name=self.collection_name,
                        query_vector=query_vector,
                        limit=limit,
                        query_filter=query_filter,
                        with_payload=True
                    )
                else:
                    results = []

                return [
                    {
                        "score": getattr(r, "score", 0.0),
                        "payload": getattr(r, "payload", {}),
                        "id": getattr(r, "id", "")
                    }
                    for r in results
                ]
            except Exception as e:
                print(f"[Qdrant] Search warning ({e}), falling back to memory store.")

        # In-memory vector search
        filtered_points = self._in_memory_points
        if paper_ids:
            target_ids = set(paper_ids)
            filtered_points = [p for p in filtered_points if p["payload"].get("paper_id") in target_ids]

        scored = []
        for p in filtered_points:
            score = _cosine_similarity(query_vector, p["vector"])
            scored.append({
                "score": score,
                "payload": p["payload"],
                "id": p["id"]
            })

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:limit]

    async def delete_paper_points(self, paper_id: str):
        if self.client and HAS_QDRANT and rest_models is not None:
            try:
                self.client.delete(
                    collection_name=self.collection_name,
                    points_selector=rest_models.FilterSelector(
                        filter=rest_models.Filter(
                            must=[
                                rest_models.FieldCondition(
                                    key="paper_id",
                                    match=rest_models.MatchValue(value=paper_id)
                                )
                            ]
                        )
                    )
                )
            except Exception as e:
                print(f"[Qdrant] Delete error: {e}")
        
        self._in_memory_points = [p for p in self._in_memory_points if p["payload"].get("paper_id") != paper_id]

qdrant_service = QdrantService()
