"""Subscriptions API: generate Clash / V2Ray / plain-text subscriptions on the fly."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from formatter import to_clash_yaml, to_v2ray_subscription  # type: ignore[import-not-found]
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import get_sub_cache
from app.core.rate_limit import limit_subscription
from app.database import get_db
from app.models import Node
from app.pipeline import _SCRIPTS_DIR  # noqa: F401  (ensures scripts/ on path)

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


async def _fetch_nodes(
    db: AsyncSession,
    protocol: str | None,
    region: str | None,
    alive_only: bool,
    limit: int,
) -> list[Node]:
    """Fetch nodes for subscription generation."""
    stmt = select(Node).where(Node.is_deleted == False)  # noqa: E712
    if alive_only:
        stmt = stmt.where(Node.is_alive == True)  # noqa: E712
    if protocol:
        stmt = stmt.where(Node.protocol == protocol.lower())
    if region:
        stmt = stmt.where(Node.region == region)
    stmt = stmt.order_by(Node.last_latency_ms.asc().nullslast()).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


def _build_response(content: str, media_type: str, filename: str) -> Response:
    return Response(content=content, media_type=media_type, headers={
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Cache-Control": "public, max-age=300",
    })


@router.get("/clash", dependencies=[Depends(limit_subscription)])
async def subscription_clash(
    db: AsyncSession = Depends(get_db),
    protocol: str | None = Query(None),
    region: str | None = Query(None),
    alive: bool = Query(True),
    limit: int = Query(800, ge=1, le=2000),
) -> Response:
    """Generate a Clash YAML subscription."""
    cache_key = f"sub:clash:{protocol}:{region}:{alive}:{limit}"
    cache = get_sub_cache()
    cached = cache.get(cache_key)
    if cached is not None:
        content, media_type, filename = cached
        return _build_response(content, media_type, filename)
    nodes = await _fetch_nodes(db, protocol, region, alive, limit)
    if not nodes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No nodes available")
    links = [n.raw_link for n in nodes]
    content = to_clash_yaml(links)
    cache[cache_key] = (content, "text/yaml", "freenode-clash.yaml")
    return _build_response(content, "text/yaml", "freenode-clash.yaml")


@router.get("/v2ray", dependencies=[Depends(limit_subscription)])
async def subscription_v2ray(
    db: AsyncSession = Depends(get_db),
    protocol: str | None = Query(None),
    region: str | None = Query(None),
    alive: bool = Query(True),
    limit: int = Query(800, ge=1, le=2000),
) -> Response:
    """Generate a Base64-encoded V2Ray subscription."""
    cache_key = f"sub:v2ray:{protocol}:{region}:{alive}:{limit}"
    cache = get_sub_cache()
    cached = cache.get(cache_key)
    if cached is not None:
        content, media_type, filename = cached
        return _build_response(content, media_type, filename)
    nodes = await _fetch_nodes(db, protocol, region, alive, limit)
    if not nodes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No nodes available")
    links = [n.raw_link for n in nodes]
    content = to_v2ray_subscription(links)
    cache[cache_key] = (content, "text/plain", "freenode-v2ray.txt")
    return _build_response(content, "text/plain", "freenode-v2ray.txt")


@router.get("/plain", dependencies=[Depends(limit_subscription)])
async def subscription_plain(
    db: AsyncSession = Depends(get_db),
    alive: bool = Query(True),
    limit: int = Query(300, ge=1, le=1000),
) -> Response:
    """Generate a plain HTTP/SOCKS proxy list (proxies.txt equivalent)."""
    cache_key = f"sub:plain:{alive}:{limit}"
    cache = get_sub_cache()
    cached = cache.get(cache_key)
    if cached is not None:
        content, media_type, filename = cached
        return _build_response(content, media_type, filename)
    # Note: this endpoint returns proxy-style entries; nodes are vmess/vless/ss/trojan
    # so this is kept for API symmetry. For raw proxies, use /api/nodes?protocol=...
    # Return node links as plain text (one per line) for non-Clash clients.
    stmt = select(Node).where(Node.is_deleted == False)  # noqa: E712
    if alive:
        stmt = stmt.where(Node.is_alive == True)  # noqa: E712
    stmt = stmt.order_by(Node.last_latency_ms.asc().nullslast()).limit(limit)
    result = await db.execute(stmt)
    links = [n.raw_link for n in result.scalars().all()]
    if not links:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No nodes available")
    content = "\n".join(links) + "\n"
    cache[cache_key] = (content, "text/plain", "freenode-plain.txt")
    return _build_response(content, "text/plain", "freenode-plain.txt")
