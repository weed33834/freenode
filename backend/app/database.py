"""Async SQLAlchemy engine and session management.

Engine is lazily built via :func:`get_engine` so tests can call
:func:`reset_engine` after swapping ``FREENODE_DATABASE_URL``.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


# Lazily initialised singletons; reset_engine() drops them so tests can rebind.
_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _build_engine() -> AsyncEngine:
    """Build a fresh async engine from current settings."""
    settings = get_settings()
    database_url = settings.database_url
    if database_url.startswith("sqlite://") and "aiosqlite" not in database_url:
        database_url = database_url.replace("sqlite://", "sqlite+aiosqlite://", 1)

    new_engine = create_async_engine(
        database_url,
        echo=settings.debug,
        pool_pre_ping=True,  # catches stale PG connections; no-op on SQLite
        pool_recycle=1800,
    )

    # SQLite WAL + FK pragmas applied on connect.
    if database_url.startswith("sqlite"):

        @event.listens_for(new_engine.sync_engine, "connect")
        def _set_sqlite_pragma(dbapi_conn, _record):  # type: ignore[no-untyped-def]
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA busy_timeout=5000")
            cursor.close()

    return new_engine


def get_engine() -> AsyncEngine:
    """Return the process-wide engine, building it on first use."""
    global _engine
    if _engine is None:
        _engine = _build_engine()
    return _engine


def reset_engine() -> None:
    """Drop the cached engine/session factory (test-only)."""
    global _engine, _session_factory
    _engine = None
    _session_factory = None


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async session."""
    async with get_session_factory()() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


@asynccontextmanager
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Context manager for background tasks that need a session."""
    async with get_session_factory()() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
