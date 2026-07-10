"""Health & admin API."""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy import Integer, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import invalidate_all
from app.core.rate_limit import limit_public
from app.core.security import require_admin
from app.database import get_db
from app.models import Node, NodeCheck, ProxySource, SourceFetchLog
from app.schemas.schemas import (
    HealthOut,
    MetricsLastPipeline,
    MetricsNodes,
    MetricsResponse,
    MetricsSources,
    RefreshRequest,
    RegionCount,
    SourceCreateRequest,
    SourceFetchLogOut,
    SourceOut,
    SourceUpdateRequest,
    TaskResponse,
    TrendPoint,
    TrendResponse,
)
from app.services.pipeline_service import (
    _tasks,
    _track_task,
    create_task_id,
    run_full_pipeline,
)
from app.services.pipeline_service import (
    get_task_status as _get_task_status,
)

router = APIRouter(tags=["health & admin"])


@router.get("/health", response_model=HealthOut, dependencies=[Depends(limit_public)])
async def health(db: AsyncSession = Depends(get_db)) -> HealthOut:
    """Service health check. Returns ``degraded`` on error — details go to logs."""
    try:
        total = await db.scalar(
            select(func.count()).select_from(Node).where(Node.is_deleted == False)  # noqa: E712
        ) or 0
        alive = await db.scalar(
            select(func.count()).select_from(Node).where(
                Node.is_deleted == False, Node.is_alive == True  # noqa: E712
            )
        ) or 0
        last_updated = await db.scalar(
            select(func.max(Node.updated_at)).where(Node.is_deleted == False)  # noqa: E712
        )
        return HealthOut(
            status="ok",
            database="connected",
            total_nodes=total,
            alive_nodes=alive,
            last_updated=last_updated,
        )
    except Exception:
        # 内部错误细节只写日志，不返回客户端
        logging.getLogger("freenode").exception("health check failed")
        return HealthOut(
            status="degraded",
            database="error",
            total_nodes=0,
            alive_nodes=0,
            last_updated=None,
        )


@router.post(
    "/admin/refresh",
    response_model=TaskResponse,
    dependencies=[Depends(require_admin)],
)
async def trigger_refresh(body: RefreshRequest) -> TaskResponse:
    """Manually trigger a full pipeline run (requires admin API key)."""
    task_id = create_task_id()
    # Fire-and-forget; _track_task keeps a strong ref so the GC doesn't kill it.
    task = asyncio.create_task(run_full_pipeline(verify=body.verify, task_id=task_id))
    _track_task(task)
    return TaskResponse(
        task_id=task_id,
        status="accepted",
        message="Pipeline refresh started. Poll /api/admin/tasks/{task_id} for status.",
    )


@router.get(
    "/admin/tasks/{task_id}",
    dependencies=[Depends(require_admin)],
)
async def get_task_status(task_id: str) -> dict:
    """Poll the status of a pipeline task."""
    task_status = _get_task_status(task_id)
    if not task_status:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Task not found")
    return {"task_id": task_id, **task_status}


@router.delete(
    "/admin/nodes/{node_id}",
    dependencies=[Depends(require_admin)],
)
async def delete_node(node_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    """Soft-delete a node (set is_deleted=True)."""
    node = await db.get(Node, node_id)
    if not node or node.is_deleted:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Node not found")
    node.is_deleted = True
    node.updated_at = datetime.now(UTC)
    await db.commit()
    invalidate_all()
    return {"id": node_id, "deleted": True}


@router.post(
    "/admin/sources",
    response_model=SourceOut,
    dependencies=[Depends(require_admin)],
)
async def create_source(
    body: SourceCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> SourceOut:
    """Create a new source."""
    url_str = str(body.url)
    existing = await db.scalar(select(ProxySource).where(ProxySource.url == url_str))
    if existing:
        raise HTTPException(status_code=http_status.HTTP_409_CONFLICT, detail="Source URL already exists")
    source = ProxySource(
        name=body.name,
        url=url_str,
        category=body.category,
        source_type=body.source_type,
        enabled=body.enabled,
        decode_base64=body.decode_base64,
        proxy_scheme=body.proxy_scheme,
        consecutive_failures=0,
        last_fetch_at=None,
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return SourceOut.model_validate(source)


@router.patch(
    "/admin/sources/{source_id}",
    response_model=SourceOut,
    dependencies=[Depends(require_admin)],
)
async def update_source(
    source_id: int,
    body: SourceUpdateRequest,
    db: AsyncSession = Depends(get_db),
) -> SourceOut:
    """Patch a source — only fields present in body are updated."""
    source = await db.get(ProxySource, source_id)
    if not source:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Source not found")
    if body.url is not None and body.url != source.url:
        existing = await db.scalar(
            select(ProxySource).where(ProxySource.url == body.url, ProxySource.id != source_id)
        )
        if existing:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail="Source URL already exists",
            )
    for field in ("name", "url", "category", "enabled", "decode_base64", "proxy_scheme"):
        value = getattr(body, field)
        if value is not None:
            setattr(source, field, value)
    source.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(source)
    return SourceOut.model_validate(source)


@router.delete(
    "/admin/sources/{source_id}",
    dependencies=[Depends(require_admin)],
)
async def delete_source(
    source_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Hard-delete a source. FKs use ON DELETE SET NULL, so no orphans."""
    source = await db.get(ProxySource, source_id)
    if not source:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Source not found")
    await db.delete(source)
    await db.commit()
    invalidate_all()
    return {"id": source_id, "deleted": True}


@router.get(
    "/admin/sources/{source_id}/logs",
    response_model=list[SourceFetchLogOut],
    dependencies=[Depends(require_admin)],
)
async def get_source_logs(
    source_id: int,
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> list[SourceFetchLogOut]:
    """Recent fetch logs for a source, newest first."""
    source = await db.get(ProxySource, source_id)
    if not source:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Source not found")
    rows = (
        await db.execute(
            select(SourceFetchLog)
            .where(SourceFetchLog.source_id == source_id)
            .order_by(SourceFetchLog.started_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    return [SourceFetchLogOut.model_validate(r) for r in rows]


@router.get(
    "/admin/metrics",
    response_model=MetricsResponse,
    dependencies=[Depends(require_admin)],
)
async def get_metrics(db: AsyncSession = Depends(get_db)) -> MetricsResponse:
    """Aggregated metrics for the admin dashboard."""
    # 节点总数 / 存活数（不算软删的）。
    total = await db.scalar(
        select(func.count()).select_from(Node).where(Node.is_deleted == False)  # noqa: E712
    ) or 0
    alive = await db.scalar(
        select(func.count()).select_from(Node).where(
            Node.is_deleted == False, Node.is_alive == True  # noqa: E712
        )
    ) or 0

    # 按协议分布，协议统一小写。
    proto_rows = (
        await db.execute(
            select(func.lower(Node.protocol).label("protocol"), func.count().label("count"))
            .where(Node.is_deleted == False)  # noqa: E712
            .group_by(func.lower(Node.protocol))
        )
    ).all()
    by_protocol = {row.protocol: row.count for row in proto_rows}

    # 按地区分布，取 top5。
    region_rows = (
        await db.execute(
            select(Node.region.label("region"), func.count().label("count"))
            .where(Node.is_deleted == False)  # noqa: E712
            .group_by(Node.region)
            .order_by(func.count().desc(), Node.region.asc())
            .limit(5)
        )
    ).all()
    by_region_top5 = [RegionCount(region=r.region, count=r.count) for r in region_rows]

    # 数据源总数 / 启用数。
    src_total = await db.scalar(select(func.count()).select_from(ProxySource)) or 0
    src_enabled = await db.scalar(
        select(func.count()).select_from(ProxySource).where(ProxySource.enabled == True)  # noqa: E712
    ) or 0

    # 最近一次完成的流水线任务（completed / failed），按结束时间取最新。
    last_pipeline = None
    finished = [
        t for t in _tasks.values()
        if t.get("status") in ("completed", "failed") and t.get("finished_at")
    ]
    if finished:
        latest = max(finished, key=lambda t: t["finished_at"])
        last_pipeline = MetricsLastPipeline(
            status=latest["status"],
            finished_at=latest["finished_at"],
            alive_nodes=latest.get("alive_nodes"),
        )

    return MetricsResponse(
        nodes=MetricsNodes(total=total, alive=alive, by_protocol=by_protocol, by_region_top5=by_region_top5),
        sources=MetricsSources(total=src_total, enabled=src_enabled),
        last_pipeline=last_pipeline,
    )


@router.get(
    "/admin/metrics/trend",
    response_model=TrendResponse,
    dependencies=[Depends(require_admin)],
)
async def get_metrics_trend(db: AsyncSession = Depends(get_db)) -> TrendResponse:
    """最近 7 天每天的检查数和存活数，给仪表盘趋势图用。"""
    # 含今天往前数 7 天
    since = datetime.now(UTC) - timedelta(days=6)
    rows = (
        await db.execute(
            select(
                func.date(NodeCheck.checked_at).label("date"),
                func.count().label("checked"),
                func.sum(cast(NodeCheck.is_alive, Integer)).label("alive"),
            )
            .where(NodeCheck.checked_at >= since)
            .group_by(func.date(NodeCheck.checked_at))
            .order_by(func.date(NodeCheck.checked_at).asc())
        )
    ).all()
    days = [
        TrendPoint(date=row.date, checked=row.checked, alive=int(row.alive or 0))
        for row in rows
    ]
    return TrendResponse(days=days)
