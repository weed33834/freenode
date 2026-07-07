import os
import pathlib

"""Shared fixtures for backend tests.

Covers env cleanup, settings-cache isolation, and a temp SQLite DB.
"""

from __future__ import annotations

from pathlib import Path

import pytest

# Ensure test data directory exists
_data_dir = pathlib.Path(__file__).resolve().parent.parent / 'backend' / 'data'
_data_dir.mkdir(parents=True, exist_ok=True)


BACKEND_DIR = Path(__file__).resolve().parent.parent

# test_api.py sets these at module top-level and leaks into other tests.
_POLLUTING_KEYS = (
    "FREENODE_DEBUG",
    "FREENODE_DATABASE_URL",
    "FREENODE_ADMIN_API_KEY",
    "FREENODE_MAX_NODES",
    "FREENODE_MAX_PROXIES",
    "FREENODE_VERIFY_NODES",
    "FREENODE_CORS_ORIGINS",
    "FREENODE_SECRET_KEY_HEX",
)


@pytest.fixture
def clean_env(monkeypatch):
    """Clear FREENODE_ env vars so Settings falls back to defaults."""
    for k in _POLLUTING_KEYS:
        monkeypatch.delenv(k, raising=False)
    from app.config import get_settings

    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def temp_db(monkeypatch, tmp_path):
    """Temp SQLite DB. Also calls reset_engine() so the new URL takes effect."""
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("FREENODE_DATABASE_URL", f"sqlite:///{db_path}")
    from app.config import get_settings
    from app.database import reset_engine

    get_settings.cache_clear()
    reset_engine()
    yield db_path
    get_settings.cache_clear()
    reset_engine()
    for suffix in ("", "-wal", "-shm", "-journal"):
        p = db_path.with_name(f"{db_path.name}{suffix}")
        if p.exists():
            p.unlink()


@pytest.fixture
def reset_crypto_singleton():
    """Clear the AESGCM singleton before/after each crypto test."""
    import app.core.crypto as crypto

    crypto._aesgcm = None
    yield
    crypto._aesgcm = None
