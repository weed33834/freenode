"""Proxy source and fetch-log ORM models."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import BigInteger, Boolean, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

# SQLite-compatible auto-increment primary key.
PK = BigInteger().with_variant(Integer, "sqlite")


def _now() -> datetime:
    return datetime.now(UTC)


class ProxySource(Base):
    """A configured data source (subscription URL or proxy list API)."""

    __tablename__ = "proxy_sources"

    id: Mapped[int] = mapped_column(PK, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    # "nodes" (subscription) or "proxies" (plain proxy list).
    category: Mapped[str] = mapped_column(String(16), nullable=False, default="nodes")
    source_type: Mapped[str] = mapped_column(String(32), nullable=False, default="subscription")
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    decode_base64: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    proxy_scheme: Mapped[str] = mapped_column(String(16), nullable=False, default="http")

    # Runtime state.
    last_fetch_at: Mapped[datetime | None] = mapped_column(nullable=True)
    last_fetch_status: Mapped[str | None] = mapped_column(String(16), nullable=True)
    last_nodes_added: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    consecutive_failures: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(nullable=False, default=_now)
    updated_at: Mapped[datetime] = mapped_column(nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        Index("idx_sources_enabled", "enabled", unique=False),
    )


class SourceFetchLog(Base):
    """Per-fetch execution log for observability."""

    __tablename__ = "source_fetch_logs"

    id: Mapped[int] = mapped_column(PK, primary_key=True, autoincrement=True)
    source_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("proxy_sources.id", ondelete="SET NULL"), nullable=True, index=True
    )
    source_name: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    started_at: Mapped[datetime] = mapped_column(nullable=False, default=_now)
    finished_at: Mapped[datetime | None] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="running")
    raw_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    parsed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    new_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    __table_args__ = (
        Index("idx_fetchlog_source_time", "source_id", "started_at", unique=False),
    )
