import os
import uuid
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models as rest_models
from backend.app.core.config import settings

class QdrantService:
    def __init__(self):
        self.collection_name = settings.QDRANT_COLLECTION_NAME
        
        # Connect to managed Qdrant if URL provided, else use embedded local storage
        if settings.QDRANT_URL:
            self.client = QdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY or None,
                timeout=15.0
            )
        else:
            storage_path = os.path.abspath("./qdrant_storage")
            os.makedirs(storage_path, exist_ok=True)
            try:
                self.client = QdrantClient(path=storage_path)
            except Exception as e:
                print(f"[Qdrant] Local path locked, using in-memory vector client: {e}")
                self.client = QdrantClient(location=":memory:")

    def init_collection(self, vector_size: int = 768):
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

    async def upsert_paper_chunks(
        self,
        paper_id: str,
        chunks: List[str],
        vectors: List[List[float]],
        metadatas: Optional[List[Dict[str, Any]]] = None
    ):
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

    async def search(
        self,
        query_vector: List[float],
        limit: int = 8,
        paper_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
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
            print(f"[Qdrant] Search warning: {e}")
            return []

    async def delete_paper_points(self, paper_id: str):
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

qdrant_service = QdrantService()
