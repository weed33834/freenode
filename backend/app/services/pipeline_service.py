"""Pipeline service: crawl → parse → verify → upsert into DB → publish files.

Mirrors `scripts/update.py`, but writes structured data into the database
instead of just flat files. We still publish the flat files so the existing
subscription URLs keep working.
"""

from __future__ import annotations

import asyncio
import json
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path

from cachetools import TTLCache

# Reuse the existing pipeline modules from scripts/.
from crawler import crawl  # type: ignore[import-not-found]
from dedup import dedup_by_fingerprint  # type: ignore[import-not-found]
from formatter import write_outputs  # type: ignore[import-not-found]
from parser import (  # type: ignore[import-not-found]
    extract_node_links,
    node_to_clash_config,
    parse_proxy_api_response,
)
from sqlalchemy import select, update
from verifier import can_reach_public_internet, verify_nodes  # type: ignore[import-not-found]

from app.config import get_settings
from app.core.cache import invalidate_all
from app.database import db_session
from app.models import Node, NodeCheck, ProxySource
from app.pipeline import _SCRIPTS_DIR  # noqa: F401  (ensures scripts/ on path)
from utils import get_logger  # type: ignore[import-not-found]

logger = get_logger("pipeline")


def _now() -> datetime:
    return datetime.now(UTC)


async def _sync_source_meta(all_sources: list[dict]) -> None:
    """把 crawl 结果里的 update_interval / protocols 同步到 proxy_sources 表。

    crawl() 已从 sources.json 透传这两个字段到每个 entry；按 name 匹配 DB 行，
    缺失的源不创建（proxy_sources 表由 create_source API 维护，这里只回填展示信息）。
    """
    meta = {
        item["name"]: (
            item.get("update_interval"),
            ",".join(item["protocols"]) if item.get("protocols") else None,
        )
        for item in all_sources
        if item.get("name")
    }
    if not meta:
        return
    async with db_session() as session:
        rows = (
            await session.scalars(
                select(ProxySource).where(ProxySource.name.in_(meta))
            )
        ).all()
        changed = False
        for src in rows:
            interval, protocols = meta[src.name]
            if src.update_interval != interval or src.protocols != protocols:
                src.update_interval = interval
                src.protocols = protocols
                src.updated_at = _now()
                changed = True
        if changed:
            await session.commit()


# In-memory task registry for manual refresh tracking.
_tasks: TTLCache = TTLCache(maxsize=256, ttl=7 * 86400)

# Strong refs to background asyncio.Tasks. CPython only holds weak refs to
# running tasks, so without these they'd be GC'd mid-flight.
_running_tasks: set[asyncio.Task] = set()


def _track_task(task: asyncio.Task) -> None:
    _running_tasks.add(task)
    task.add_done_callback(_running_tasks.discard)


def _parse_node_fields(link: str) -> dict:
    """Extract structured fields from a raw node link via the existing parser."""
    cfg = node_to_clash_config(link)
    if not cfg:
        return {}
    protocol = link.split("://", 1)[0].lower()
    network = cfg.get("network", "tcp")
    # Collect transport-specific options into a JSON blob.
    transport: dict = {}
    for key in ("ws-opts", "grpc-opts", "h2-opts", "skip-cert-verify"):
        if key in cfg:
            transport[key] = cfg[key]
    sni = cfg.get("sni") or cfg.get("servername")
    if sni:
        transport["sni"] = sni

    auth_secret = cfg.get("uuid", "") if protocol in ("vmess", "vless") else cfg.get("password", "")

    return {
        "protocol": protocol,
        "server": cfg.get("server", ""),
        "port": int(cfg.get("port", 0)),
        "auth_secret": str(auth_secret),
        "network": str(network),
        "tls": bool(cfg.get("tls", False)),
        "remark": str(cfg.get("name", "")),
        "transport_config": json.dumps(transport, ensure_ascii=False),
    }


async def run_full_pipeline(verify: bool | None = None, task_id: str | None = None) -> dict:
    """Execute the complete crawl->parse->verify->upsert->publish cycle.

    阻塞调用（crawl/verify）丢到线程池，DB 操作直接用 async session。
    """
    settings = get_settings()
    if verify is None:
        verify = settings.verify_nodes

    if task_id:
        _tasks[task_id] = {"status": "running", "started_at": _now()}

    try:
        started = time.perf_counter()

        # 1. Crawl（阻塞，放线程池）
        logger.info("starting crawl")
        raw = await asyncio.to_thread(crawl)
        node_sources = raw["nodes"]
        proxy_sources = raw["proxies"]
        logger.info("fetched %d node sources, %d proxy sources", len(node_sources), len(proxy_sources))

        # 2. Parse node links
        all_links: list[str] = []
        for item in node_sources:
            links = extract_node_links(item["text"])
            all_links.extend(links)
        all_links = list(dict.fromkeys(all_links))
        logger.info("total unique node links: %d", len(all_links))

        # 跨源指纹去重：很多社区源互相镜像，同节点换 remark/编码又出现一次
        all_links = dedup_by_fingerprint(all_links)
        logger.info("after fingerprint dedup: %d links", len(all_links))

        # 3. Verify（阻塞，放线程池）
        should_verify = verify and await asyncio.to_thread(can_reach_public_internet)
        if should_verify and all_links:
            logger.info("verifying %d nodes", len(all_links))
            results = await asyncio.to_thread(
                verify_nodes,
                all_links,
                settings.verify_workers,
                settings.geo_enabled,
                settings.verify_timeout,
            )
            result_map = {r["link"]: r for r in results}
            alive_links = [r["link"] for r in results if r["alive"]][: settings.max_nodes]
        else:
            # Offline / verify skipped: don't touch is_alive, otherwise the
            # soft-delete sweep below would wipe the whole table.
            result_map = {}
            alive_links = all_links[: settings.max_nodes]

        # 4. Parse proxies
        all_proxies: list[str] = []
        for item in proxy_sources:
            proxies = parse_proxy_api_response(
                item["text"], default_scheme=item.get("proxy_scheme", "http")
            )
            all_proxies.extend(proxies)
        all_proxies = list(dict.fromkeys(all_proxies))[: settings.max_proxies]

        # 5. Upsert nodes into DB（异步）
        # Pass all_links (not alive_links) so the soft-delete sweep only drops
        # nodes that disappeared from sources, not ones that failed verify.
        if should_verify:
            upserted, refreshed = await _upsert_nodes(
                all_links, result_map, node_sources
            )
        else:
            upserted, refreshed = await _upsert_nodes(
                all_links, result_map, node_sources, skip_alive_state=True
            )
        logger.info("upserted %d nodes (%d refreshed)", upserted, refreshed)

        # 5.5 回填 sources.json 的 update_interval/protocols 到 proxy_sources 表（展示用）
        await _sync_source_meta(node_sources + proxy_sources)

        # 6. Publish flat files
        await asyncio.to_thread(_publish_files, alive_links, all_proxies, result_map)

        elapsed = round(time.perf_counter() - started, 2)
        summary = {
            "node_sources": len(node_sources),
            "proxy_sources": len(proxy_sources),
            "total_links": len(all_links),
            "alive_nodes": len(alive_links),
            "upserted": upserted,
            "refreshed": refreshed,
            "proxies": len(all_proxies),
            "verified": should_verify,
            "elapsed_seconds": elapsed,
        }
        logger.info("pipeline done in %ss: %s", elapsed, summary)
        invalidate_all()
        if task_id:
            _tasks[task_id] = {"status": "completed", "finished_at": _now(), **summary}
        return summary
    except Exception as exc:
        logger.exception("pipeline failed")
        if task_id:
            _tasks[task_id] = {"status": "failed", "finished_at": _now(), "error": str(exc)}
        raise


async def run_verify_pipeline(
    only_dead: bool = False, task_id: str | None = None
) -> dict:
    """只验证 DB 里已有节点，不重新 crawl。

    流程：查 DB → 收 raw_link → verify_nodes → 回写 Node + NodeCheck →
    重新 publish 平面文件 → 清缓存。

    only_dead=True 时只复验 is_alive=False 的死节点，给它们复活机会；
    默认只复验 is_alive=True 的存活节点。
    """
    settings = get_settings()
    mode = "verify_dead" if only_dead else "verify_alive"

    if task_id:
        _tasks[task_id] = {"status": "running", "started_at": _now()}

    try:
        started = time.perf_counter()

        # 1. 从 DB 拉要验证的节点（is_deleted=False；按 only_dead 切存活/死亡）
        async with db_session() as session:
            stmt = select(Node.id, Node.raw_link).where(Node.is_deleted == False)  # noqa: E712
            if only_dead:
                stmt = stmt.where(Node.is_alive == False)  # noqa: E712
            else:
                stmt = stmt.where(Node.is_alive == True)  # noqa: E712
            rows = (await session.execute(stmt)).all()

        # (node_id, raw_link) 配对，跳过没 raw_link 的脏数据
        targets = [(row.id, row.raw_link) for row in rows if row.raw_link]
        if not targets:
            elapsed = round(time.perf_counter() - started, 2)
            summary = {
                "mode": mode,
                "verified": 0,
                "alive": 0,
                "dead": 0,
                "elapsed_seconds": elapsed,
            }
            logger.info("verify pipeline: no nodes to check, done in %ss", elapsed)
            invalidate_all()
            if task_id:
                _tasks[task_id] = {"status": "completed", "finished_at": _now(), **summary}
            return summary

        # 2. raw_link 列表给 verifier，同时建 link→node_id 反查
        links = [link for _, link in targets]
        node_id_by_link: dict[str, int] = {link: nid for nid, link in targets}
        logger.info("verify pipeline: checking %d nodes (only_dead=%s)", len(links), only_dead)

        # 3. 验证（阻塞，丢线程池）
        results = await asyncio.to_thread(
            verify_nodes,
            links,
            settings.verify_workers,
            settings.geo_enabled,
            settings.verify_timeout,
        )
        result_map = {r["link"]: r for r in results}

        # 4 + 5. 回写每个 Node 的验证字段 + 写 NodeCheck 记录
        now = _now()
        alive_count = 0
        async with db_session() as session:
            # 一次 SELECT 拉所有目标 Node，改成在内存里改属性 + commit 时批量 flush，
            # 避免 N 次 await session.execute(update(...)) 各自带一次 round-trip
            target_ids = [nid for nid in node_id_by_link.values() if nid]
            nodes_by_id: dict[int, Node] = (
                {
                    n.id: n
                    for n in (
                        await session.scalars(
                            select(Node).where(Node.id.in_(target_ids))
                        )
                    ).all()
                }
                if target_ids
                else {}
            )
            checks: list[NodeCheck] = []
            for link, result in result_map.items():
                node_id = node_id_by_link.get(link)
                if not node_id:
                    continue
                node = nodes_by_id.get(node_id)
                if node is None:
                    continue
                is_alive = bool(result.get("alive"))
                latency = result.get("latency_ms")
                fail_reason = result.get("error")
                if is_alive:
                    alive_count += 1
                node.is_alive = is_alive
                node.last_latency_ms = latency
                node.last_checked_at = now
                node.fail_reason = fail_reason
                node.updated_at = now
                checks.append(
                    NodeCheck(
                        node_id=node_id,
                        checked_at=now,
                        is_alive=is_alive,
                        latency_ms=latency,
                        fail_reason=fail_reason,
                    )
                )
            if checks:
                session.add_all(checks)
            await session.commit()

        # 6. 重新 publish 平面文件（DB 里 alive 节点 + 现有 proxies，不重新抓 proxies）
        alive_links = [r["link"] for r in results if r.get("alive")]
        proxies = _load_existing_proxies()
        await asyncio.to_thread(_publish_files, alive_links, proxies, result_map)

        # 7. 清缓存
        elapsed = round(time.perf_counter() - started, 2)
        summary = {
            "mode": mode,
            "verified": len(links),
            "alive": alive_count,
            "dead": len(links) - alive_count,
            "elapsed_seconds": elapsed,
        }
        logger.info("verify pipeline done in %ss: %s", elapsed, summary)
        invalidate_all()
        if task_id:
            _tasks[task_id] = {"status": "completed", "finished_at": _now(), **summary}
        return summary
    except Exception as exc:
        logger.exception("verify pipeline failed")
        if task_id:
            _tasks[task_id] = {"status": "failed", "finished_at": _now(), "error": str(exc)}
        raise


def _load_existing_proxies() -> list[str]:
    p = Path(get_settings().nodes_output_dir) / "proxies.txt"
    if not p.exists():
        return []
    return [
        line
        for raw in p.read_text(encoding="utf-8").splitlines()
        if (line := raw.strip()) and not line.startswith("#")
    ]


async def _upsert_nodes(
    links: list[str],
    result_map: dict,
    node_sources: list[dict],
    skip_alive_state: bool = False,
) -> tuple[int, int]:
    """Upsert parsed nodes. Returns (new_count, updated_count).

    ``skip_alive_state`` leaves is_alive / latency / fail_reason untouched —
    used when verify was skipped so we don't mark everything dead.
    """
    new_count = 0
    updated_count = 0

    # Build a source-name lookup from the crawl result order.
    source_name_by_link: dict[str, str] = {}
    for item in node_sources:
        src_name = item.get("name", "unknown")
        for link in extract_node_links(item["text"]):
            if link not in source_name_by_link:
                source_name_by_link[link] = src_name

    # Precompute fingerprints for all valid links (for upsert + soft-delete set).
    valid: list[tuple[str, dict, str]] = []  # (link, fields, fingerprint)
    for link in links:
        fields = _parse_node_fields(link)
        if not fields or not fields["server"] or not fields["port"]:
            continue
        fp = Node.compute_fingerprint(
            fields["protocol"], fields["server"], fields["port"], fields["auth_secret"]
        )
        valid.append((link, fields, fp))
    current_fingerprints = {fp for _, _, fp in valid}

    async with db_session() as session:
        now = _now()
        # 预取所有匹配指纹的现有节点，避免每个链接一次 SELECT（N+1）
        existing_by_fp: dict[str, Node] = (
            {
                n.fingerprint: n
                for n in (
                    await session.scalars(
                        select(Node).where(
                            Node.fingerprint.in_([fp for _, _, fp in valid])
                        )
                    )
                ).all()
            }
            if valid
            else {}
        )
        for link, fields, fingerprint in valid:
            result = result_map.get(link, {})
            is_alive = result.get("alive", False) if not skip_alive_state else None
            latency = result.get("latency_ms") if not skip_alive_state else None
            region = result.get("region", "unknown") or "unknown"
            fail_reason = result.get("error") if not skip_alive_state else None

            existing = existing_by_fp.get(fingerprint)
            if existing:
                existing.raw_link = link
                existing.transport_config = fields["transport_config"]
                existing.tls = fields["tls"]
                existing.network = fields["network"]
                existing.remark = fields["remark"]
                existing.region = region
                if not skip_alive_state:
                    existing.is_alive = bool(is_alive)
                    existing.last_latency_ms = latency
                    existing.last_checked_at = now
                    existing.fail_reason = fail_reason
                existing.is_deleted = False
                existing.source_name = source_name_by_link.get(link, existing.source_name)
                existing.auth_secret = Node.encrypt_secret(fields["auth_secret"])
                existing.updated_at = now
                updated_count += 1
                node_id = existing.id
            else:
                node = Node(
                    fingerprint=fingerprint,
                    raw_link=link,
                    protocol=fields["protocol"],
                    server=fields["server"],
                    port=fields["port"],
                    auth_secret=Node.encrypt_secret(fields["auth_secret"]),
                    network=fields["network"],
                    transport_config=fields["transport_config"],
                    tls=fields["tls"],
                    remark=fields["remark"],
                    region=region,
                    source_name=source_name_by_link.get(link, "unknown"),
                    is_alive=bool(is_alive) if not skip_alive_state else False,
                    last_latency_ms=latency,
                    last_checked_at=now if not skip_alive_state else None,
                    fail_reason=fail_reason,
                    is_deleted=False,
                )
                session.add(node)
                await session.flush()
                node_id = node.id
                new_count += 1

            # Record a check log entry only when verification actually ran.
            if result_map and not skip_alive_state:
                session.add(
                    NodeCheck(
                        node_id=node_id,
                        checked_at=now,
                        is_alive=bool(is_alive),
                        latency_ms=latency,
                        fail_reason=fail_reason,
                    )
                )

        # Soft-delete nodes that disappeared from all sources this run.
        # 注意：current_fingerprints 是「本次抓到的全部指纹」，
        # 所以「抓到但验证失败」「超过 max_nodes 截断」的节点都不会被软删，
        # verify_dead 任务后续还能查到它们给复活机会。
        if current_fingerprints:
            await session.execute(
                update(Node)
                .where(Node.is_deleted == False)  # noqa: E712
                .where(Node.fingerprint.notin_(list(current_fingerprints)))
                .values(is_deleted=True, updated_at=now)
            )

        await session.commit()

    return new_count, updated_count


def _publish_files(links: list[str], proxies: list[str], result_map: dict) -> None:
    """Write the legacy flat subscription files (clash.yaml, v2ray.txt, ...)."""
    out_dir = Path(get_settings().nodes_output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    # write_outputs expects either raw link strings or result dicts.
    items: list = [
        r if (r := result_map.get(link)) else link
        for link in links
    ]
    try:
        write_outputs(items, proxies)
    except Exception:
        logger.exception("failed to publish flat files")


def get_task_status(task_id: str) -> dict | None:
    """Return the status of an async pipeline task."""
    return _tasks.get(task_id)


def create_task_id() -> str:
    return uuid.uuid4().hex
