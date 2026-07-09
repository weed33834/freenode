"""In-memory token-bucket rate limiter (single-process).

Trusts ``X-Real-IP`` from the reverse proxy, falls back to the leftmost
``X-Forwarded-For`` entry, then ``request.client.host``. The bucket dict
is LRU-bounded so a flood of spoofed IPs can't exhaust memory.
"""

from __future__ import annotations

import time
from collections import OrderedDict

from fastapi import HTTPException, Request, status

# 单 bucket 最多缓存多少 IP。超出按 LRU 驱逐，防止内存无界增长。
_MAX_TRACKED_IPS = 4096


class TokenBucket:
    """Token bucket with bounded LRU tracking."""

    def __init__(self, rate: float, capacity: int) -> None:
        self.rate = rate
        self.capacity = capacity
        # OrderedDict 维持 LRU 顺序：访问 / 写入时 move_to_end。
        self._tokens: OrderedDict[str, float] = OrderedDict()
        self._last: OrderedDict[str, float] = OrderedDict()

    def _touch(self, key: str, default_tokens: float, default_last: float) -> None:
        """Add a new key with default values, evicting the oldest entry when over cap."""
        self._tokens[key] = default_tokens
        self._last[key] = default_last
        if len(self._tokens) > _MAX_TRACKED_IPS:
            # popitem(last=False) 弹出最旧的（LRU 头）
            self._tokens.popitem(last=False)
            self._last.popitem(last=False)

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        if key in self._tokens:
            elapsed = now - self._last[key]
            self._last[key] = now
            self._tokens[key] = min(self.capacity, self._tokens[key] + elapsed * self.rate)
            self._tokens.move_to_end(key)
            self._last.move_to_end(key)
        else:
            # 新 key 默认满桶
            self._touch(key, float(self.capacity), now)

        if self._tokens[key] >= 1:
            self._tokens[key] -= 1
            return True
        return False


# 60 requests per minute per IP for public endpoints.
_public_bucket = TokenBucket(rate=1.0, capacity=60)
# 10 requests per minute for subscription endpoints.
_sub_bucket = TokenBucket(rate=1.0 / 6, capacity=10)


def _client_ip(request: Request) -> str:
    """Client IP: ``X-Real-IP`` → leftmost ``X-Forwarded-For`` → ``client.host``."""
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        parts = [p.strip() for p in forwarded.split(",") if p.strip()]
        if parts:
            return parts[0]
    return request.client.host if request.client else "unknown"


async def limit_public(request: Request) -> None:
    """Dependency: 60 req/min per IP for public endpoints."""
    ip = _client_ip(request)
    if ip == "unknown":
        return
    if not _public_bucket.allow(ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Try again later.",
            headers={"Retry-After": "60"},
        )


async def limit_subscription(request: Request) -> None:
    """Dependency: 10 req/min per IP for subscription generation endpoints."""
    ip = _client_ip(request)
    if ip == "unknown":
        return
    if not _sub_bucket.allow(ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Subscription rate limit exceeded. Try again later.",
            headers={"Retry-After": "60"},
        )
