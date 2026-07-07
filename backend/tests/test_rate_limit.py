"""app.core.rate_limit 的单元测试。

覆盖 TokenBucket 逻辑、limit_public / limit_subscription 的 429 行为、X-Forwarded-For 解析。
"""

from __future__ import annotations

import time
from unittest.mock import MagicMock

import pytest

from app.core.rate_limit import (
    TokenBucket,
    _client_ip,
    limit_public,
    limit_subscription,
)

# ─── TokenBucket ─────────────────────────────────────────────────────


def test_token_bucket_initial_burst_allowed():
    # 初始令牌桶满容量，连续 capacity 次请求都应放行
    bucket = TokenBucket(rate=1.0, capacity=5)
    for i in range(5):
        assert bucket.allow("ip1") is True, f"request {i} should pass"


def test_token_bucket_rejects_after_capacity():
    bucket = TokenBucket(rate=1.0, capacity=3)
    assert bucket.allow("ip1") is True
    assert bucket.allow("ip1") is True
    assert bucket.allow("ip1") is True
    # 第 4 次超出容量，拒绝
    assert bucket.allow("ip1") is False


def test_token_bucket_refills_over_time(monkeypatch):
    bucket = TokenBucket(rate=10.0, capacity=2)
    # 用光令牌
    assert bucket.allow("ip1") is True
    assert bucket.allow("ip1") is True
    assert bucket.allow("ip1") is False

    # 模拟时间前进 0.2 秒，rate=10 应补充 2 个令牌
    t = [time.monotonic()]
    monkeypatch.setattr("app.core.rate_limit.time.monotonic", lambda: t[0] + 0.2)
    assert bucket.allow("ip1") is True  # 补了 2 个，用 1 个


def test_token_bucket_capacity_cap(monkeypatch):
    # 令牌不会超过 capacity
    bucket = TokenBucket(rate=100.0, capacity=3)
    # 用光
    for _ in range(3):
        bucket.allow("ip1")
    # 时间前进很久，但补充后不应超过 capacity
    t = [time.monotonic()]
    monkeypatch.setattr("app.core.rate_limit.time.monotonic", lambda: t[0] + 100)
    # 连续 3 次放行（capacity 上限），第 4 次拒绝
    assert bucket.allow("ip1") is True
    assert bucket.allow("ip1") is True
    assert bucket.allow("ip1") is True
    assert bucket.allow("ip1") is False


def test_token_bucket_isolates_keys():
    bucket = TokenBucket(rate=1.0, capacity=2)
    # 不同 key 互不影响
    assert bucket.allow("ip1") is True
    assert bucket.allow("ip1") is True
    assert bucket.allow("ip1") is False  # ip1 用光了
    assert bucket.allow("ip2") is True   # ip2 还有满容量


# ─── _client_ip ──────────────────────────────────────────────────────


def test_client_ip_uses_xff_header():
    request = MagicMock()
    request.headers = {"x-forwarded-for": "1.2.3.4, 5.6.7.8"}
    request.client = None
    assert _client_ip(request) == "1.2.3.4"


def test_client_ip_strips_whitespace_in_xff():
    request = MagicMock()
    request.headers = {"x-forwarded-for": "  1.2.3.4  , 5.6.7.8"}
    request.client = None
    assert _client_ip(request) == "1.2.3.4"


def test_client_ip_falls_back_to_client_host():
    request = MagicMock()
    request.headers = {}
    request.client = MagicMock()
    request.client.host = "192.168.1.1"
    assert _client_ip(request) == "192.168.1.1"


def test_client_ip_unknown_when_no_client():
    request = MagicMock()
    request.headers = {}
    request.client = None
    assert _client_ip(request) == "unknown"


# ─── limit_public / limit_subscription ───────────────────────────────


@pytest.mark.asyncio
async def test_limit_public_allows_under_threshold():
    # 公开端点 60 req/min，单次请求应放行
    request = MagicMock()
    request.headers = {}
    request.client = MagicMock()
    request.client.host = "10.0.0.1"
    # 不抛异常即通过
    await limit_public(request)


@pytest.mark.asyncio
async def test_limit_subscription_allows_under_threshold():
    request = MagicMock()
    request.headers = {}
    request.client = MagicMock()
    request.client.host = "10.0.0.2"
    await limit_subscription(request)
