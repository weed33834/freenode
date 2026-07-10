"""Stats API: global statistics, protocol breakdown, region grouping."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Integer, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import get_stats_cache
from app.core.rate_limit import limit_public
from app.database import get_db
from app.models import Node, ProxySource
from app.schemas.schemas import GlobalStats, ProtocolStat, RegionStat

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=GlobalStats, dependencies=[Depends(limit_public)])
async def get_stats(db: AsyncSession = Depends(get_db)) -> GlobalStats:
    """Global aggregate statistics."""
    cache = get_stats_cache()
    cached = cache.get("stats:global")
    if cached is not None:
        return cached
    total = await db.scalar(
        select(func.count()).select_from(Node).where(Node.is_deleted == False)  # noqa: E712
    ) or 0
    alive = await db.scalar(
        select(func.count()).select_from(Node).where(
            Node.is_deleted == False, Node.is_alive == True  # noqa: E712
        )
    ) or 0
    avg_lat = await db.scalar(
        select(func.avg(Node.last_latency_ms)).where(
            Node.is_deleted == False,  # noqa: E712
            Node.is_alive == True,  # noqa: E712
            Node.last_latency_ms.is_not(None),
        )
    )
    last_updated = await db.scalar(select(func.max(Node.updated_at)).where(Node.is_deleted == False))  # noqa: E712

    total_sources = await db.scalar(select(func.count()).select_from(ProxySource)) or 0
    enabled_sources = await db.scalar(
        select(func.count()).select_from(ProxySource).where(ProxySource.enabled == True)  # noqa: E712
    ) or 0

    result = GlobalStats(
        total_nodes=total,
        alive_nodes=alive,
        dead_nodes=total - alive,
        survival_rate=round(alive / total * 100, 1) if total else 0.0,
        avg_latency_ms=round(float(avg_lat), 1) if avg_lat else None,
        total_sources=total_sources,
        enabled_sources=enabled_sources,
        last_updated=last_updated,
    )
    cache["stats:global"] = result
    return result


@router.get("/protocols", response_model=list[ProtocolStat], dependencies=[Depends(limit_public)])
async def get_protocol_stats(db: AsyncSession = Depends(get_db)) -> list[ProtocolStat]:
    """Node counts grouped by protocol."""
    cache = get_stats_cache()
    cached = cache.get("stats:protocols")
    if cached is not None:
        return cached
    stmt = (
        select(
            Node.protocol,
            func.count().label("total"),
            func.sum(cast(Node.is_alive, Integer)).label("alive"),
        )
        .where(Node.is_deleted == False)  # noqa: E712
        .group_by(Node.protocol)
        .order_by(func.count().desc())
    )
    result = await db.execute(stmt)
    rows = [
        ProtocolStat(protocol=row.protocol, total=row.total, alive=int(row.alive or 0))
        for row in result.all()
    ]
    cache["stats:protocols"] = rows
    return rows


@router.get("/regions", response_model=list[RegionStat], dependencies=[Depends(limit_public)])
async def get_region_stats(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
) -> list[RegionStat]:
    """Node counts and average latency grouped by region."""
    cache_key = f"stats:regions:{limit}"
    cache = get_stats_cache()
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    stmt = (
        select(
            Node.region,
            func.count().label("total"),
            func.sum(cast(Node.is_alive, Integer)).label("alive"),
            func.avg(Node.last_latency_ms).label("avg_lat"),
        )
        .where(Node.is_deleted == False)  # noqa: E712
        .group_by(Node.region)
        .order_by(func.count().desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = [
        RegionStat(
            region=row.region,
            total=row.total,
            alive=int(row.alive or 0),
            avg_latency_ms=round(float(row.avg_lat), 1) if row.avg_lat else None,
        )
        for row in result.all()
    ]
    cache[cache_key] = rows
    return rows
