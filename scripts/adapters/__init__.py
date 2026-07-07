"""Source adapter 注册表。

按 ``source["type"]`` 分发到对应 adapter。内置 github_raw / web_url / html /
git_repo / rss 五种；第三方可通过 :func:`register_adapter` 注册自定义适配器。
"""

from __future__ import annotations

from adapters.base import SourceAdapter
from adapters.git_repo import GitRepoAdapter
from adapters.github_raw import GithubRawAdapter
from adapters.html import HtmlAdapter
from adapters.rss import RssAdapter
from adapters.web_url import WebUrlAdapter

_REGISTRY: dict[str, SourceAdapter] = {}


def register_adapter(adapter: SourceAdapter) -> None:
    """注册一个 adapter 实例，按 ``source_type`` 入注册表（覆盖同名）。"""
    _REGISTRY[adapter.source_type] = adapter


def unregister_adapter(source_type: str) -> None:
    """注销一个 adapter，不存在时静默忽略。"""
    _REGISTRY.pop(source_type, None)


def get_adapter(source_type: str) -> SourceAdapter | None:
    """按 type 取 adapter，找不到返回 None（由调用方兜底）。"""
    return _REGISTRY.get(source_type)


def list_adapters() -> list[str]:
    """列出已注册的 source type（按字母序）。"""
    return sorted(_REGISTRY.keys())


# 注册内置 adapter
for _cls in (GithubRawAdapter, WebUrlAdapter, HtmlAdapter, GitRepoAdapter, RssAdapter):
    register_adapter(_cls())


__all__ = [
    "SourceAdapter",
    "register_adapter",
    "unregister_adapter",
    "get_adapter",
    "list_adapters",
]
