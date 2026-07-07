"""Security dependencies: admin API key validation."""

from __future__ import annotations

import secrets

from fastapi import Header, HTTPException, status

from app.config import get_settings


async def require_admin(x_api_key: str | None = Header(default=None)) -> None:
    """Dependency that validates the admin API key.

    Raises 401 if the key is not configured or does not match.
    """
    settings = get_settings()
    expected = settings.admin_api_key
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin API is disabled (no key configured)",
        )
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )
    # Encode to bytes — compare_digest raises TypeError on non-ASCII str.
    try:
        ok = secrets.compare_digest(
            x_api_key.encode("utf-8"),
            expected.encode("utf-8"),
        )
    except Exception:
        ok = False
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )
