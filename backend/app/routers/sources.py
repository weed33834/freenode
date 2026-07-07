"""Sources API: list data sources and their fetch status."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rate_limit import limit_public
from app.database import get_db
from app.models import ProxySource
from app.schemas.schemas import SourceOut

router = APIRouter(prefix="/sources", tags=["sources"])


@router.get("", response_model=list[SourceOut], dependencies=[Depends(limit_public)])
async def list_sources(
    db: AsyncSession = Depends(get_db),
    enabled: bool | None = Query(None, description="Filter by enabled status"),
    category: str | None = Query(None, description="Filter by category (nodes/proxies)"),
) -> list[SourceOut]:
    """List all configured data sources with their runtime status."""
    stmt = select(ProxySource)
    if enabled is not None:
        stmt = stmt.where(ProxySource.enabled == enabled)
    if category:
        stmt = stmt.where(ProxySource.category == category)
    stmt = stmt.order_by(ProxySource.name)
    result = await db.execute(stmt)
    return [SourceOut.model_validate(s) for s in result.scalars().all()]
