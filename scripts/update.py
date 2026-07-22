from __future__ import annotations

import argparse
import os
import shutil
import sys
from datetime import UTC, datetime
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
# 验证前预截断上限：节点数激增时（如 5000+）避免验证耗时爆炸。
# 0 = 不预截断（向后兼容）；>0 时按源可靠性加权取前 N 个再 verify。
# 建议生产 CI 设为 2000-3000，本地开发设 0。
VERIFY_CAP = _get_int_env("FREENODE_VERIFY_CAP", 0)
# 数据快照归档：每次更新后把 nodes/*.yaml/.txt 复制到 nodes/archive/YYYY-MMDD/，
# 保留 ARCHIVE_RETENTION 天，超过自动清理。0 = 关闭归档。
ARCHIVE_RETENTION = _get_int_env("FREENODE_ARCHIVE_RETENTION", 30)
# 需要归档的文件列表
ARCHIVE_FILES = ("clash.yaml", "v2ray.txt", "proxies.txt", "quality.json")


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

    P2-D 灰度准入：
    - observing → 连续 3 天 reliability > 70% → 自动升级为 active
    - active → 连续 7 天 reliability < 30% → 降级为 observing（不直接禁用，留给用户决定）
    - 变更直接写回 sources.json 并记录到 sources-report.json 的 promotion_log。
    """
    import json
    from datetime import UTC, datetime

    try:
        config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("cannot read sources.json for reliability report: %s", exc)
        return

    # 收集所有 enabled 源（保留指向 config 里的原始对象引用，便于改 status 字段）
    enabled = []
    for category in ("free_node_sources", "free_proxy_apis"):
        for src in config.get(category, []):
            if src.get("enabled", False):
                enabled.append({"name": src.get("name", "unknown"), "category": category, "_ref": src})

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
    promotion_log = []
    if report_path.exists():
        try:
            old = json.loads(report_path.read_text(encoding="utf-8"))
            history = old.get("history", [])
            promotion_log = old.get("promotion_log", [])
        except (OSError, json.JSONDecodeError):
            history = []
    history = [h for h in history if h.get("date") != today]
    history.append({"date": today, "sources": today_sources})
    history = history[-14:]

    # 计算每个源的 14 天 reliability，并维护 status 升降级
    reliability = {}
    promotions_today = []
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
        score = round(success_days / total_days * 100, 1) if total_days else 0.0
        reliability[name] = score

        # P2-D 灰度准入升降级
        current_status = src["_ref"].get("status", "active")
        new_status = _evaluate_status(current_status, score, total_days)
        if new_status and new_status != current_status:
            src["_ref"]["status"] = new_status
            entry = {
                "date": today,
                "name": name,
                "from": current_status,
                "to": new_status,
                "reliability": score,
                "observed_days": total_days,
            }
            promotions_today.append(entry)
            logger.info(
                "status promotion: %s %s → %s (reliability=%.1f%%, %d days)",
                name, current_status, new_status, score, total_days,
            )

    # 升降级变更写回 sources.json（保留原结构与格式）
    if promotions_today:
        # 移除 _ref 临时键，不写入 sources.json
        for src in enabled:
            src.pop("_ref", None)
        try:
            CONFIG_PATH.write_text(
                json.dumps(config, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            logger.info("sources.json updated with %d status promotion(s)", len(promotions_today))
        except OSError as exc:
            logger.warning("failed to write sources.json: %s", exc)
        promotion_log.extend(promotions_today)
        # 保留最近 100 条变更记录，避免无限增长
        promotion_log = promotion_log[-100:]

    report = {
        "generated_at": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "window_days": 14,
        "reliability_score": reliability,
        "history": history,
        "promotion_log": promotion_log,
    }
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    logger.info("source reliability report written to %s", report_path)


def _evaluate_status(current: str, reliability: float, observed_days: int) -> str | None:
    """P2-D 灰度准入：根据当前 status 与 reliability 决定是否升降级。

    - observing → 连续 3+ 天 reliability > 70% → active
    - active → 连续 7+ 天 reliability < 30% → observing（不直接禁用）
    - 其它情况返回 None（保持不变）

    observed_days 不足时不够触发升降级，避免单日抖动误判。
    """
    if current == "observing" and observed_days >= 3 and reliability > 70:
        return "active"
    if current == "active" and observed_days >= 7 and reliability < 30:
        return "observing"
    return None


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
        # 验证前预截断：节点数激增时避免验证耗时爆炸
        # 默认 VERIFY_CAP=0 不截断；CI 设为 2000-3000 时按源可靠性加权取前 N
        if VERIFY_CAP > 0 and len(all_links) > VERIFY_CAP:
            logger.warning(
                "links (%d) exceed VERIFY_CAP (%d); truncating before verify "
                "to avoid timeout explosion. Set FREENODE_VERIFY_CAP=0 to disable.",
                len(all_links),
                VERIFY_CAP,
            )
            all_links = all_links[:VERIFY_CAP]

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

    # 数据快照归档：把 nodes/*.yaml/.txt 复制到 nodes/archive/YYYY-MMDD/，便于回滚
    _archive_snapshot()

    if failed_sources:
        logger.warning("%d source(s) had extraction issues:", len(failed_sources))
        for name, error in failed_sources:
            logger.warning("  - %s: %s", name, error)

    return 0


def _archive_snapshot(archive_dir: Path = NODES_DIR / "archive") -> None:
    """把当前 nodes/ 输出快照归档到 nodes/archive/YYYY-MMDD/，保留 ARCHIVE_RETENTION 天。

    用于灾难恢复：若最新 PR 把数据搞崩了，可以从 archive 目录手动恢复上一份可用数据。
    """
    if ARCHIVE_RETENTION <= 0:
        return

    today = datetime.now(UTC).strftime("%Y-%m%d")
    today_dir = archive_dir / today
    today_dir.mkdir(parents=True, exist_ok=True)

    archived = 0
    for fname in ARCHIVE_FILES:
        src = NODES_DIR / fname
        if src.exists():
            shutil.copy2(src, today_dir / fname)
            archived += 1
    if archived:
        logger.info("archived %d files to %s", archived, today_dir)

    # 清理过期快照
    cutoff = datetime.now(UTC).strftime("%Y-%m%d")
    cleaned = 0
    if archive_dir.exists():
        for sub in archive_dir.iterdir():
            if not sub.is_dir():
                continue
            # 目录名格式 YYYY-MMDD，比 cutoff 早的删除
            if sub.name < cutoff:
                # 只清理比今天早 ARCHIVE_RETENTION 天以上的
                try:
                    dir_date = datetime.strptime(sub.name, "%Y-%m%d").replace(tzinfo=UTC)
                    age_days = (datetime.now(UTC) - dir_date).days
                    if age_days > ARCHIVE_RETENTION:
                        shutil.rmtree(sub)
                        cleaned += 1
                except ValueError:
                    continue
    if cleaned:
        logger.info("cleaned %d expired archive snapshots (older than %d days)", cleaned, ARCHIVE_RETENTION)


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
