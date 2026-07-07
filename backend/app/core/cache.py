"""简单的 TTL 内存缓存。单进程够用，多进程要换 Redis。"""

from __future__ import annotations

from cachetools import TTLCache

# stats 和 filters 聚合查询缓存 60 秒
_stats_cache: TTLCache = TTLCache(maxsize=16, ttl=60)
_filters_cache: TTLCache = TTLCache(maxsize=16, ttl=60)
# 订阅结果缓存 300 秒，和 Cache-Control 对齐
_sub_cache: TTLCache = TTLCache(maxsize=64, ttl=300)


def get_stats_cache() -> TTLCache:
    return _stats_cache


def get_filters_cache() -> TTLCache:
    return _filters_cache


def get_sub_cache() -> TTLCache:
    return _sub_cache


def invalidate_all() -> None:
    """流水线跑完后清掉所有缓存，让下次请求拿新数据。"""
    _stats_cache.clear()
    _filters_cache.clear()
    _sub_cache.clear()
