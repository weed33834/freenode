"""Concurrent crawler for free node/proxy sources."""

from __future__ import annotations

import json
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import httpx
from adapters import get_adapter

from utils import (
    NODES_DIR,
    USER_AGENT,
    FetchError,
    decode_bytes,
    get_logger,
    load_sources,
    safe_b64decode,
    validate_url,
)

logger = get_logger("crawler")


def _reliability_floor() -> float:
    """读环境变量 FREENODE_RELIABILITY_FLOOR，返回最低可接受的 reliability 百分比。"""
    raw = os.environ.get("FREENODE_RELIABILITY_FLOOR", "0")
    try:
        return max(0.0, float(raw))
    except (TypeError, ValueError):
        return 0.0


def _load_reliability_scores() -> dict[str, float]:
    """读 nodes/sources-report.json 的 reliability_score，读不到返回空 dict。"""
    report_path = NODES_DIR / "sources-report.json"
    if not report_path.exists():
        return {}
    try:
        data = json.loads(report_path.read_text(encoding="utf-8"))
        scores = data.get("reliability_score", {})
        return {name: float(score) for name, score in scores.items()}
    except (OSError, ValueError, TypeError):
        return {}


def _fetch_with_httpx(url: str, timeout: int, max_bytes: int) -> str:
    """用 httpx 流式抓取，强制 max_bytes 上限。

    httpx 已是项目依赖（discover_sources/publish_mirrors 也在用），统一走它，
    替代早期 urllib + curl subprocess 的混用方案。
    """
    try:
        with httpx.Client(
            timeout=timeout,
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT},
        ) as client, client.stream("GET", url) as resp:
            resp.raise_for_status()
            # 流式读取并在超限时立即中断，避免大响应撑爆内存
            chunks: list[bytes] = []
            size = 0
            for chunk in resp.iter_bytes():
                size += len(chunk)
                if size > max_bytes:
                    raise FetchError(f"response too large (>{max_bytes} bytes): {url}")
                chunks.append(chunk)
            return decode_bytes(b"".join(chunks))
    except httpx.TimeoutException as exc:
        raise FetchError(f"timed out: {exc}") from exc
    except httpx.HTTPStatusError as exc:
        raise FetchError(f"http {exc.response.status_code}: {url}") from exc
    except httpx.HTTPError as exc:
        raise FetchError(f"fetch failed: {exc}") from exc


def fetch(
    url: str,
    timeout: int = 20,
    retries: int = 1,
    max_bytes: int = 10 * 1024 * 1024,
) -> str:
    """Fetch URL with retries.

    过大/超时是确定性失败（重试也是同样结果），直接抛；其它网络错误重试一次。
    """
    validate_url(url)
    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            return _fetch_with_httpx(url, timeout, max_bytes)
        except FetchError as exc:
            last_error = exc
            err = str(exc).lower()
            # 过大/超时不重试
            if "timed out" in err or "too large" in err:
                raise
            if attempt >= retries:
                raise
    raise last_error or FetchError(f"failed to fetch {url}")


def maybe_decode_base64(text: str) -> str:
    """If the whole text looks like base64, try decoding it once."""
    text = text.strip()
    if not text or "://" in text or "\n" in text:
        return text
    decoded = safe_b64decode(text)
    if decoded is None:
        return text
    return decoded.decode("utf-8", errors="ignore")


def fetch_source(source: dict) -> str:
    text = fetch(
        source["url"],
        timeout=source.get("timeout", 20),
        max_bytes=source.get("max_size", 10 * 1024 * 1024),
    )
    if source.get("decode_base64", False):
        text = maybe_decode_base64(text)
    return text


def _fetch_source_safe(source: dict, category: str) -> dict | None:
    """Fetch a single source and return its raw entry, or None on failure.

    优先按 ``source["type"]`` 走对应 adapter；没注册 adapter 时退回旧的
    ``fetch_source`` 逻辑，保证向后兼容。
    """
    name = source.get("name", "unknown")
    try:
        start = time.perf_counter()
        adapter = get_adapter(source.get("type", ""))
        if adapter is not None:
            text = adapter.fetch(source)
        else:
            # 兜底：没注册 adapter 时走旧的 fetch_source
            text = fetch_source(source)
        elapsed = time.perf_counter() - start
        logger.info("fetched %s in %.2fs", name, elapsed)
        entry = {"name": name, "text": text, "category": category}
        if "proxy_scheme" in source:
            entry["proxy_scheme"] = source["proxy_scheme"]
        return entry
    except Exception as exc:
        logger.warning("failed %s: %s", name, exc)
        return None


def _collect_sources(config, key, category, floor, scores, skipped, sources):
    for source in config.get(key, []):
        if not source.get("enabled"):
            continue
        name = source.get("name", "unknown")
        if floor > 0 and not source.get("force_enabled", False):
            score = scores.get(name)
            if score is not None and score < floor:
                skipped.append((name, score))
                continue
        sources.append((source, category))


def crawl(config_path: Path | None = None, max_workers: int | None = None) -> dict:
    """Fetch all enabled sources concurrently.

    max_workers defaults to FREENODE_CRAWL_WORKERS or the number of enabled sources.

    reliability 低于 FREENODE_RELIABILITY_FLOOR 的源会被自动跳过，
    除非在 sources.json 里标了 ``"force_enabled": true``。
    """
    config = load_sources(config_path)

    floor = _reliability_floor()
    scores = _load_reliability_scores() if floor > 0 else {}

    sources: list[tuple[dict, str]] = []
    skipped_by_reliability: list[tuple[str, float]] = []
    _collect_sources(config, "free_node_sources", "nodes", floor, scores, skipped_by_reliability, sources)
    _collect_sources(config, "free_proxy_apis", "proxies", floor, scores, skipped_by_reliability, sources)

    if skipped_by_reliability:
        for name, score in skipped_by_reliability:
            logger.info("skipped low-reliability source %s (%.1f%%)", name, score)

    raw: dict[str, list[dict]] = {"nodes": [], "proxies": []}

    if max_workers is None:
        env_workers = os.environ.get("FREENODE_CRAWL_WORKERS", "")
        if env_workers.isdigit():
            max_workers = max(1, int(env_workers))
        else:
            max_workers = min(16, max(1, len(sources)))

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_source = {
            executor.submit(_fetch_source_safe, source, category): source
            for source, category in sources
        }
        for future in as_completed(future_to_source):
            result = future.result()
            if result:
                category = result.pop("category")
                raw[category].append(result)

    return raw


if __name__ == "__main__":
    result = crawl()
    logger.info(
        "fetched %d node sources, %d proxy sources",
        len(result["nodes"]),
        len(result["proxies"]),
    )
