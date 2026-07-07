"""app.core.security 的单元测试。

覆盖 require_admin 三种分支：未配 key → 503、key 不匹配 → 401、key 匹配 → 通过。
"""

from __future__ import annotations

import secrets

import pytest
from fastapi import HTTPException

from app.core.security import require_admin


@pytest.mark.asyncio
async def test_require_admin_disabled_when_no_key(clean_env):
    # 没配 admin_api_key，所有请求都返回 503
    with pytest.raises(HTTPException) as exc:
        await require_admin(x_api_key="anything")
    assert exc.value.status_code == 503
    assert "disabled" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_require_admin_rejects_missing_key(monkeypatch):
    key = secrets.token_urlsafe(32)
    monkeypatch.setenv("FREENODE_ADMIN_API_KEY", key)
    from app.config import get_settings

    get_settings.cache_clear()

    with pytest.raises(HTTPException) as exc:
        await require_admin(x_api_key=None)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_require_admin_rejects_wrong_key(monkeypatch):
    key = secrets.token_urlsafe(32)
    monkeypatch.setenv("FREENODE_ADMIN_API_KEY", key)
    from app.config import get_settings

    get_settings.cache_clear()

    with pytest.raises(HTTPException) as exc:
        await require_admin(x_api_key="wrong-key")
    assert exc.value.status_code == 401
    assert "invalid" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_require_admin_accepts_correct_key(monkeypatch):
    key = secrets.token_urlsafe(32)
    monkeypatch.setenv("FREENODE_ADMIN_API_KEY", key)
    from app.config import get_settings

    get_settings.cache_clear()

    # 正确 key 不抛异常，返回 None
    result = await require_admin(x_api_key=key)
    assert result is None


@pytest.mark.asyncio
async def test_require_admin_uses_constant_time_compare(monkeypatch):
    # 即使 key 长度不同也不应泄露（compare_digest 不会抛错）
    monkeypatch.setenv("FREENODE_ADMIN_API_KEY", "short")
    from app.config import get_settings

    get_settings.cache_clear()

    with pytest.raises(HTTPException) as exc:
        await require_admin(x_api_key="much-longer-wrong-key")
    assert exc.value.status_code == 401
