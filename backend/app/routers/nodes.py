"""Nodes API: list, detail, search."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import get_filters_cache
from app.core.rate_limit import limit_public
from app.database import get_db
from app.models import Node, NodeCheck
from app.schemas.schemas import (
    FilterOption,
    FiltersResponse,
    NodeCheckOut,
    NodeDetail,
    NodeOut,
    PaginatedResponse,
)

router = APIRouter(prefix="/nodes", tags=["nodes"])


def _split_csv(v: str | None) -> list[str] | None:
    # 逗号分隔的多值参数解析，空串或纯逗号当 None 处理
    if not v:
        return None
    values = [item.strip() for item in v.split(",") if item.strip()]
    return values or None


def _escape_like(value: str) -> str:
    """转义 LIKE/ILIKE 中的通配符，让用户输入的 % 和 _ 不被当通配符。

    用反斜杠转义，配合 .escape("\\") 告诉数据库转义字符。
    """
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("", response_model=PaginatedResponse[NodeOut], dependencies=[Depends(limit_public)])
async def list_nodes(
    db: AsyncSession = Depends(get_db),
    protocol: str | None = Query(None, description="Filter by protocol (vmess/vless/ss/trojan)"),
    region: str | None = Query(None, description="Filter by region"),
    alive: bool | None = Query(None, description="Filter by liveness"),
    max_latency: int | None = Query(None, description="Max latency in ms"),
    q: str | None = Query(None, description="Search remark/region"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    sort: str = Query("updated", description="Sort: updated|latency|newest"),
) -> PaginatedResponse[NodeOut]:
    """List nodes with optional filtering, search, and pagination."""
    stmt = select(Node).where(Node.is_deleted == False)  # noqa: E712

    # 多值协议筛选，统一小写
    protocols = _split_csv(protocol)
    if protocols:
        protocols = [p.lower() for p in protocols]
        stmt = stmt.where(Node.protocol.in_(protocols))
    # 多值地区筛选，大小写按原样
    regions = _split_csv(region)
    if regions:
        stmt = stmt.where(Node.region.in_(regions))
    if alive is not None:
        stmt = stmt.where(Node.is_alive == alive)
    if max_latency is not None:
        stmt = stmt.where(Node.last_latency_ms <= max_latency)
    if q:
        # 转义用户输入的 % 和 _，避免把它们当通配符
        escaped = _escape_like(q)
        pattern = f"%{escaped}%"
        stmt = stmt.where(
            Node.remark.ilike(pattern, escape="\\") | Node.region.ilike(pattern, escape="\\")
        )

    # Total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = await db.scalar(count_stmt) or 0

    # Sort
    if sort == "latency":
        stmt = stmt.order_by(Node.last_latency_ms.asc().nullslast())
    elif sort == "newest":
        stmt = stmt.order_by(Node.first_seen_at.desc())
    else:
        stmt = stmt.order_by(Node.updated_at.desc())

    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    items = [NodeOut.model_validate(n) for n in result.scalars().all()]

    return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/filters", response_model=FiltersResponse, dependencies=[Depends(limit_public)])
async def get_node_filters(db: AsyncSession = Depends(get_db)) -> FiltersResponse:
    """返回可用的协议和地区列表（带计数），给前端筛选下拉用。"""
    cache = get_filters_cache()
    cached = cache.get("filters")
    if cached is not None:
        return cached
    # 协议用 lower 归一后再分组
    proto_stmt = (
        select(func.lower(Node.protocol).label("protocol"), func.count().label("count"))
        .where(Node.is_deleted == False)  # noqa: E712
        .group_by(func.lower(Node.protocol))
    )
    proto_rows = (await db.execute(proto_stmt)).all()
    protocols = [FilterOption(value=row.protocol, count=row.count) for row in proto_rows]
    # 计数降序，同计数按字母升序
    protocols.sort(key=lambda o: (-o.count, o.value))

    # 地区按原样分组
    region_stmt = (
        select(Node.region.label("region"), func.count().label("count"))
        .where(Node.is_deleted == False)  # noqa: E712
        .group_by(Node.region)
    )
    region_rows = (await db.execute(region_stmt)).all()
    regions = [FilterOption(value=row.region, count=row.count) for row in region_rows]
    regions.sort(key=lambda o: (-o.count, o.value))

    result = FiltersResponse(protocols=protocols, regions=regions)
    cache["filters"] = result
    return result


@router.get("/{node_id}", response_model=NodeDetail, dependencies=[Depends(limit_public)])
async def get_node(node_id: int, db: AsyncSession = Depends(get_db)) -> NodeDetail:
    """Get a single node. auth_secret is never returned — use /api/subscriptions/* for raw_link."""
    node = await db.get(Node, node_id)
    if not node or node.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")
    return NodeDetail.model_validate(node)


@router.get(
    "/{node_id}/history",
    response_model=list[NodeCheckOut],
    dependencies=[Depends(limit_public)],
)
async def get_node_history(
    node_id: int,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
) -> list[NodeCheckOut]:
    """Get verification history for a node."""
    stmt = (
        select(NodeCheck)
        .where(NodeCheck.node_id == node_id)
        .order_by(NodeCheck.checked_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return [NodeCheckOut.model_validate(c) for c in result.scalars().all()]
