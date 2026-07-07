"""Node verification history (time-series) ORM model."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import BigInteger, Boolean, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

# SQLite-compatible auto-increment primary key.
PK = BigInteger().with_variant(Integer, "sqlite")


def _now() -> datetime:
    return datetime.now(UTC)


class NodeCheck(Base):
    """A single verification attempt for a node (latency / liveness history)."""

    __tablename__ = "node_checks"

    id: Mapped[int] = mapped_column(PK, primary_key=True, autoincrement=True)
    node_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    checked_at: Mapped[datetime] = mapped_column(nullable=False, default=_now)
    is_alive: Mapped[bool] = mapped_column(Boolean, nullable=False)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fail_reason: Mapped[str | None] = mapped_column(String(64), nullable=True)
    raw_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("idx_checks_node_time", "node_id", "checked_at", unique=False),
        Index("idx_checks_time", "checked_at", unique=False),
    )
