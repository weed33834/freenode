"""Node ORM model — the central table storing parsed proxy nodes."""

from __future__ import annotations

import hashlib
from datetime import datetime

from sqlalchemy import Boolean, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models import PK, _now


class Node(Base):
    """A single proxy node parsed from a data source."""

    __tablename__ = "nodes"

    id: Mapped[int] = mapped_column(PK, primary_key=True, autoincrement=True)

    # Dedup key: sha256(protocol + server + port + auth_secret).
    fingerprint: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    # The original share link (ss://, vmess://, vless://, trojan://).
    raw_link: Mapped[str] = mapped_column(Text, nullable=False)

    protocol: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    server: Mapped[str] = mapped_column(String(255), nullable=False)
    port: Mapped[int] = mapped_column(Integer, nullable=False)
    auth_secret: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # Transport configuration (path, host, sni, alpn, serviceName, ...).
    network: Mapped[str] = mapped_column(String(16), nullable=False, default="tcp")
    # JSON string of protocol-specific transport / TLS options.
    transport_config: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    tls: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Human-readable remark / name (decoded from the link fragment).
    remark: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    region: Mapped[str] = mapped_column(String(64), nullable=False, default="unknown", index=True)

    source_name: Mapped[str] = mapped_column(String(128), nullable=False, default="")

    # Verification state (denormalised for fast list filtering).
    is_alive: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    last_latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_checked_at: Mapped[datetime | None] = mapped_column(nullable=True)
    fail_reason: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Lifecycle.
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    first_seen_at: Mapped[datetime] = mapped_column(nullable=False, default=_now)
    updated_at: Mapped[datetime] = mapped_column(nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        # Primary list query: alive nodes by region, excluding soft-deleted.
        Index("idx_nodes_alive_region", "is_alive", "region", unique=False),
        Index("idx_nodes_protocol_alive", "protocol", "is_alive", unique=False),
        Index("idx_nodes_checked", "last_checked_at", unique=False),
    )

    @staticmethod
    def compute_fingerprint(protocol: str, server: str, port: int, auth_secret: str) -> str:
        """Stable dedup hash for a node identity."""
        raw = f"{protocol.lower()}|{server.lower()}|{port}|{auth_secret}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @staticmethod
    def encrypt_secret(plaintext: str) -> str:
        # 写库前调；没配 key 就是明文透传，保证开发/测试能跑。
        from app.core import crypto
        return crypto.encrypt(plaintext or "")

    @staticmethod
    def decrypt_secret(ciphertext: str) -> str:
        # 读出来调；解密失败（key 换了 / 旧明文）就原样返回，避免详情接口 500。
        from app.core import crypto
        try:
            return crypto.decrypt(ciphertext or "")
        except ValueError:
            return ciphertext
