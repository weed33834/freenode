"""Pydantic response/request schemas for the API."""

from __future__ import annotations

from datetime import datetime
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, HttpUrl, field_validator

T = TypeVar("T")


class ORMModel(BaseModel):
    """Base config for models that wrap ORM objects."""

    model_config = ConfigDict(from_attributes=True)


# --------------------------------------------------------------------------- #
# Node schemas
# --------------------------------------------------------------------------- #
class NodeOut(ORMModel):
    id: int
    protocol: str
    server: str
    port: int
    network: str
    tls: bool
    remark: str
    region: str
    source_name: str
    is_alive: bool
    last_latency_ms: int | None
    last_checked_at: datetime | None
    first_seen_at: datetime
    updated_at: datetime


class NodeDetail(NodeOut):
    raw_link: str
    transport_config: str
    fail_reason: str | None
    # auth_secret intentionally omitted — fetch via /api/subscriptions/* instead.


class NodeCheckOut(ORMModel):
    checked_at: datetime
    is_alive: bool
    latency_ms: int | None
    fail_reason: str | None


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int


class FilterOption(BaseModel):
    value: str
    count: int


class FiltersResponse(BaseModel):
    protocols: list[FilterOption]
    regions: list[FilterOption]


# --------------------------------------------------------------------------- #
# Stats schemas
# --------------------------------------------------------------------------- #
class ProtocolStat(BaseModel):
    protocol: str
    total: int
    alive: int


class RegionStat(BaseModel):
    region: str
    total: int
    alive: int
    avg_latency_ms: float | None


class GlobalStats(BaseModel):
    total_nodes: int
    alive_nodes: int
    dead_nodes: int
    survival_rate: float
    avg_latency_ms: float | None
    total_sources: int
    enabled_sources: int
    last_updated: datetime | None


# --------------------------------------------------------------------------- #
# Source schemas
# --------------------------------------------------------------------------- #
class SourceOut(ORMModel):
    id: int
    name: str
    url: str
    category: str
    source_type: str
    enabled: bool
    decode_base64: bool
    proxy_scheme: str
    last_fetch_at: datetime | None
    last_fetch_status: str | None
    last_nodes_added: int
    last_error: str | None
    consecutive_failures: int
    updated_at: datetime


# --------------------------------------------------------------------------- #
# Health & admin
# --------------------------------------------------------------------------- #
class HealthOut(BaseModel):
    status: str
    database: str
    total_nodes: int
    alive_nodes: int
    last_updated: datetime | None


class RefreshRequest(BaseModel):
    verify: bool = True


class SourceCreateRequest(BaseModel):
    name: str
    url: HttpUrl
    category: Literal["free_node_sources", "free_proxy_apis"] = "free_node_sources"
    source_type: Literal["node", "proxy"] = "node"  # node 或 proxy
    enabled: bool = True
    decode_base64: bool = False
    proxy_scheme: Literal["http", "https", "socks4", "socks5"] = "http"

    @field_validator("name")
    @classmethod
    def _name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("name must not be empty")
        return v.strip()


class SourceUpdateRequest(BaseModel):
    name: str | None = None
    url: str | None = None
    category: str | None = None
    enabled: bool | None = None
    decode_base64: bool | None = None
    proxy_scheme: str | None = None


class TaskResponse(BaseModel):
    task_id: str
    status: str
    message: str


# --------------------------------------------------------------------------- #
# Metrics
# --------------------------------------------------------------------------- #
class RegionCount(BaseModel):
    region: str
    count: int


class MetricsNodes(BaseModel):
    total: int
    alive: int
    by_protocol: dict[str, int]
    by_region_top5: list[RegionCount]


class MetricsSources(BaseModel):
    total: int
    enabled: int


class MetricsLastPipeline(BaseModel):
    status: str
    finished_at: datetime
    alive_nodes: int | None = None


class MetricsResponse(BaseModel):
    nodes: MetricsNodes
    sources: MetricsSources
    last_pipeline: MetricsLastPipeline | None = None


class TrendPoint(BaseModel):
    date: str
    checked: int
    alive: int


class TrendResponse(BaseModel):
    days: list[TrendPoint]


class SourceFetchLogOut(ORMModel):
    id: int
    source_id: int | None
    status: str | None
    new_count: int
    error: str | None
    started_at: datetime
