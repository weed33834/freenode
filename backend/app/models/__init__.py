"""ORM models package."""

from datetime import UTC, datetime

from sqlalchemy import BigInteger, Integer

# SQLite-compatible auto-increment primary key.
PK = BigInteger().with_variant(Integer, "sqlite")


def _now() -> datetime:
    return datetime.now(UTC)


from app.models.check import NodeCheck
from app.models.node import Node
from app.models.source import ProxySource, SourceFetchLog

__all__ = ["Node", "ProxySource", "SourceFetchLog", "NodeCheck", "PK", "_now"]
