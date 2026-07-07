"""app.core.cache 的单元测试。

覆盖三个缓存的获取、写入、清空、invalidate_all 联动。
"""

from __future__ import annotations

import pytest

from app.core.cache import (
    get_filters_cache,
    get_stats_cache,
    get_sub_cache,
    invalidate_all,
)


@pytest.fixture(autouse=True)
def _clear_caches_before_each():
    """缓存是全局单例，每个测试前都清掉，避免跨测试污染。"""
    invalidate_all()
    yield
    invalidate_all()


def test_get_stats_cache_returns_ttl_cache():
    cache = get_stats_cache()
    assert cache.maxsize == 16
    assert cache.ttl == 60


def test_get_filters_cache_returns_ttl_cache():
    cache = get_filters_cache()
    assert cache.maxsize == 16
    assert cache.ttl == 60


def test_get_sub_cache_returns_ttl_cache():
    cache = get_sub_cache()
    assert cache.maxsize == 64
    assert cache.ttl == 300


def test_stats_cache_write_and_read():
    cache = get_stats_cache()
    cache["total_nodes"] = 100
    assert cache["total_nodes"] == 100


def test_invalidate_all_clears_all_caches():
    stats = get_stats_cache()
    filters = get_filters_cache()
    sub = get_sub_cache()

    # 写入数据
    stats["a"] = 1
    filters["b"] = 2
    sub["c"] = 3
    assert len(stats) == 1
    assert len(filters) == 1
    assert len(sub) == 1

    invalidate_all()

    assert len(stats) == 0
    assert len(filters) == 0
    assert len(sub) == 0


def test_invalidate_all_idempotent():
    # 多次调用不报错
    invalidate_all()
    invalidate_all()
    assert len(get_stats_cache()) == 0
