from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.core.dependencies import get_db, rate_limit_global
from backend.app.services.graph.graph_service import graph_service
from backend.app.schemas.graph import GraphResponse, ExpandNodeRequest, ExpandNodeResponse

router = APIRouter(prefix="/graph", tags=["Knowledge Graph"], dependencies=[Depends(rate_limit_global)])

@router.get("", response_model=GraphResponse)
def get_graph(
    seeds: Optional[str] = None,
    minYear: Optional[int] = None,
    maxYear: Optional[int] = None,
    linkType: Optional[str] = Query("all", description="all, cites, semantic, author"),
    topic: Optional[str] = None,
    includeEntities: bool = Query(True, description="Include author and topic nodes"),
    db: Session = Depends(get_db)
):
    data = graph_service.build_graph(
        db=db,
        seeds=seeds,
        min_year=minYear,
        max_year=maxYear,
        link_type=linkType or "all",
        topic=topic,
        include_entities=includeEntities
    )
    return GraphResponse(
        nodes=data["nodes"],
        links=data["links"],
        seedPaperIds=data["seedPaperIds"],
        stats=data["stats"]
    )

@router.post("/expand", response_model=ExpandNodeResponse)
def expand_node(
    req: ExpandNodeRequest,
    db: Session = Depends(get_db)
):
    expansion = graph_service.expand_node(db=db, paper_id=req.paperId)
    return ExpandNodeResponse(
        newNodes=expansion["newNodes"],
        newLinks=expansion["newLinks"]
    )
