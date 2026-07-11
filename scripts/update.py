from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from crawler import crawl
from dedup import dedup_by_fingerprint
from formatter import to_clash_yaml_by_protocol, write_outputs
from parser import extract_node_links, parse_proxy_api_response
from verifier import can_reach_public_internet, stats_summary, verify_nodes

from utils import CONFIG_PATH, NODES_DIR, ConfigurationError, FetchError, ParseError, setup_logging

logger = setup_logging()


def _get_int_env(name: str, default: int) -> int:
    """Read an integer env var, returning *default* (with a warning) on bad input."""
    raw = os.environ.get(name)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except (TypeError, ValueError):
        logger.warning("invalid integer for %s=%r; using default %d", name, raw, default)
        return default


# Limits are configurable via environment variables for future scaling.
MAX_NODES = _get_int_env("FREENODE_MAX_NODES", 800)
MAX_PROXIES = _get_int_env("FREENODE_MAX_PROXIES", 300)
VERIFY_NODES = os.environ.get("FREENODE_VERIFY_NODES", "true").lower() in ("1", "true", "yes")
GEO_ENABLED = os.environ.get("FREENODE_GEO_ENABLED", "false").lower() in ("1", "true", "yes")
# Verification tuning: per-node connect timeout (seconds) and concurrency.
VERIFY_TIMEOUT = _get_int_env("FREENODE_VERIFY_TIMEOUT", 5)
VERIFY_WORKERS = _get_int_env("FREENODE_VERIFY_WORKERS", 50)
# 验证级别：tcp 只做 TCP connect；protocol 在 TCP 成功后再跑协议握手二段验证
VERIFY_LEVEL = os.environ.get("FREENODE_VERIFY_LEVEL", "tcp").strip().lower()
if VERIFY_LEVEL not in ("tcp", "protocol"):
    VERIFY_LEVEL = "tcp"


def _extract_node_links_safe(item: dict) -> tuple[list[str], str | None]:
    """Extract node links from a source, returning (links, error_message)."""
    try:
        return extract_node_links(item["text"]), None
    except Exception as exc:
        return [], f"parse error: {exc}"


def _extract_proxies_safe(item: dict) -> tuple[list[str], str | None]:
    """Extract proxies from a source, returning (proxies, error_message)."""
    try:
        return (
            parse_proxy_api_response(
                item["text"], default_scheme=item.get("proxy_scheme", "http")
            ),
            None,
        )
    except Exception as exc:
        return [], f"parse error: {exc}"


def _write_source_report(crawled: dict, output_dir: Path = NODES_DIR) -> None:
    """记录每个 enabled 源当天的抓取状态，维护 14 天滚动 reliability 评分。

    crawled 是 crawler.crawl() 返回的 {"nodes": [...], "proxies": [...]}。
    失败的源不会出现在 crawled 里（_fetch_source_safe 返回 None 被 filter），
    所以用 sources.json 里的 enabled 列表减去 crawled 里的源名字，得出失败集合。
    """
    import json
    from datetime import UTC, datetime

    try:
        config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("cannot read sources.json for reliability report: %s", exc)
        return

    # 收集所有 enabled 源
    enabled = []
    for category in ("free_node_sources", "free_proxy_apis"):
        for src in config.get(category, []):
            if src.get("enabled", False):
                enabled.append({"name": src.get("name", "unknown"), "category": category})

    # 当天抓取成功的源名字
    succeeded_names = set()
    for entry in crawled.get("nodes", []) + crawled.get("proxies", []):
        if entry.get("name"):
            succeeded_names.add(entry["name"])

    today = datetime.now(UTC).strftime("%Y-%m-%d")
    today_sources = [
        {
            "name": src["name"],
            "category": src["category"],
            "status": "success" if src["name"] in succeeded_names else "failed",
        }
        for src in enabled
    ]

    # 读取历史，去重今天，追加，保留最近 14 天
    report_path = output_dir / "sources-report.json"
    history = []
    if report_path.exists():
        try:
            old = json.loads(report_path.read_text(encoding="utf-8"))
            history = old.get("history", [])
        except (OSError, json.JSONDecodeError):
            history = []
    history = [h for h in history if h.get("date") != today]
    history.append({"date": today, "sources": today_sources})
    history = history[-14:]

    # 计算每个源的 14 天 reliability
    reliability = {}
    for src in enabled:
        name = src["name"]
        success_days = 0
        total_days = 0
        for h in history:
            for s in h["sources"]:
                if s["name"] == name:
                    total_days += 1
                    if s["status"] == "success":
                        success_days += 1
        reliability[name] = round(success_days / total_days * 100, 1) if total_days else 0.0

    report = {
        "generated_at": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "window_days": 14,
        "reliability_score": reliability,
        "history": history,
    }
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    logger.info("source reliability report written to %s", report_path)


def main(verify: bool = False) -> int:
    logger.info("starting pipeline")

    should_verify = verify and can_reach_public_internet()
    if verify and not should_verify:
        logger.warning(
            "verification requested but public internet unreachable; outputting unverified nodes"
        )

    raw = crawl()

    node_source_count = len(raw["nodes"])
    proxy_source_count = len(raw["proxies"])
    logger.info("fetched %d node sources, %d proxy sources", node_source_count, proxy_source_count)

    if node_source_count == 0 and proxy_source_count == 0:
        logger.error("no sources could be fetched")
        return 1

    failed_sources: list[tuple[str, str]] = []
    all_links = []
    for item in raw["nodes"]:
        links, error = _extract_node_links_safe(item)
        if error:
            failed_sources.append((item["name"], error))
            logger.warning("%s: %s", item["name"], error)
        else:
            logger.info("%s: %d links extracted", item["name"], len(links))
            all_links.extend(links)

    all_links = list(dict.fromkeys(all_links))
    logger.info("total unique links (by string): %d", len(all_links))

    # 跨源指纹去重：同一节点被多个源镜像的情况很常见，按内容指纹去重
    # 能在 verify 之前砍掉一批重复，省时间省带宽。
    before_dedup = len(all_links)
    all_links = dedup_by_fingerprint(all_links)
    if len(all_links) < before_dedup:
        logger.info(
            "after fingerprint dedup: %d links (removed %d duplicates)",
            len(all_links),
            before_dedup - len(all_links),
        )

    if should_verify and all_links:
        before_count = len(all_links)
        logger.info(
            "verifying %d nodes (timeout=%ds, workers=%d, verify_level=%s)",
            before_count,
            VERIFY_TIMEOUT,
            VERIFY_WORKERS,
            VERIFY_LEVEL,
        )
        results = verify_nodes(
            all_links,
            max_workers=VERIFY_WORKERS,
            geo_enabled=GEO_ENABLED,
            timeout=VERIFY_TIMEOUT,
            verify_level=VERIFY_LEVEL,
        )
        stats = stats_summary(results, verify_level=VERIFY_LEVEL)
        logger.info(
            "verification summary: before=%d, passed=%d, failed=%d, pass_rate=%.1f%%, "
            "verify_level=%s",
            before_count,
            stats["alive"],
            stats["failed"],
            stats["survival_rate"],
            VERIFY_LEVEL,
        )
        if stats["avg_latency"] is not None:
            logger.info("average latency: %.1f ms", stats["avg_latency"])
        if stats.get("failure_reasons"):
            logger.info("failure reasons:")
            for reason, count in sorted(stats["failure_reasons"].items(), key=lambda x: -x[1]):
                logger.info("  %s: %d", reason, count)
        if GEO_ENABLED:
            logger.info("region distribution:")
            for region, count in sorted(stats["regions"].items(), key=lambda x: -x[1]):
                logger.info("  %s: %d", region, count)
        else:
            logger.info("geo disabled; region distribution omitted")
        alive_results = [r for r in results if r["alive"]][:MAX_NODES]
    else:
        alive_results = all_links[:MAX_NODES]
        stats = None

    all_proxies = []
    for item in raw["proxies"]:
        proxies, error = _extract_proxies_safe(item)
        if error:
            failed_sources.append((item["name"], error))
            logger.warning("%s: %s", item["name"], error)
        else:
            logger.info("%s: %d proxies extracted", item["name"], len(proxies))
            all_proxies.extend(proxies)

    all_proxies = list(dict.fromkeys(all_proxies))[:MAX_PROXIES]
    # Let write_outputs compute stats from the actual output set so the file
    # header matches what is written to disk. Verification stats (logged above)
    # reflect the full candidate pool and may differ when MAX_NODES truncates.
    write_outputs(alive_results, all_proxies)
    logger.info("done: %d nodes, %d proxies written", len(alive_results), len(all_proxies))

    # 二段验证模式下额外写按协议分组的 Clash YAML；tcp 模式没协议信息，跳过避免无谓文件
    if VERIFY_LEVEL == "protocol" and alive_results:
        proto_yamls = to_clash_yaml_by_protocol(alive_results)
        for proto, yaml_str in proto_yamls.items():
            (NODES_DIR / f"clash-{proto}.yaml").write_text(yaml_str, encoding="utf-8")
        logger.info("wrote %d per-protocol clash yaml files", len(proto_yamls))

    # 维护 14 天滚动数据源可靠性报告（nodes/sources-report.json）
    _write_source_report(raw)

    if failed_sources:
        logger.warning("%d source(s) had extraction issues:", len(failed_sources))
        for name, error in failed_sources:
            logger.warning("  - %s: %s", name, error)

    return 0


def _main_cli() -> int:
    parser = argparse.ArgumentParser(description="Update FreeNode node and proxy lists")
    parser.add_argument(
        "--verify",
        action=argparse.BooleanOptionalAction,
        default=VERIFY_NODES,
        help="Enable/disable node connectivity verification "
        "(use --verify / --no-verify; also settable via FREENODE_VERIFY_NODES)",
    )
    args = parser.parse_args()
    try:
        return main(verify=args.verify)
    except ConfigurationError as exc:
        logger.error("configuration error: %s", exc)
        return 2
    except FetchError as exc:
        logger.error("fetch error: %s", exc)
        return 3
    except ParseError as exc:
        logger.error("parse error: %s", exc)
        return 4


if __name__ == "__main__":
    sys.exit(_main_cli())
