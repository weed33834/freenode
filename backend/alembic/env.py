"""Alembic 运行环境。复用项目的 settings 和 ORM 元数据，用同步 engine 跑迁移。"""

from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# 复用项目配置和 ORM 基类；导入所有模型让 autogenerate 能发现表。
from app.config import get_settings
from app.database import Base
from app.models import Node, NodeCheck, ProxySource, SourceFetchLog  # noqa: F401

# alembic 配置对象，能拿到 .ini 里的值。
config = context.config

# 按 .ini 配置日志。
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# autogenerate 比对用的元数据。
target_metadata = Base.metadata


def _sync_url() -> str:
    # settings.database_url 默认是 sqlite:///...；async engine 会替换成
    # sqlite+aiosqlite://，这里反过来换回同步驱动给 alembic 用。
    # PostgreSQL 同理：asyncpg → psycopg2（同步驱动，alembic 不支持 async engine）。
    url = get_settings().database_url
    if url.startswith("sqlite+aiosqlite://"):
        return url.replace("sqlite+aiosqlite://", "sqlite://", 1)
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
    return url


def run_migrations_offline() -> None:
    """离线模式：只给 URL，不发 SQL，直接把迁移脚本输出成字符串。"""
    context.configure(
        url=_sync_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """在线模式：建同步 engine，在连接里跑迁移。alembic 不支持 async engine。"""
    section = config.get_section(config.config_ini_section, {}) or {}
    # url 留空了，运行时注入同步地址。
    section["sqlalchemy.url"] = _sync_url()

    connectable = engine_from_config(
        section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,  # sqlite 改表结构需要 batch 模式
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
