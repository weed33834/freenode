from __future__ import annotations

import base64
import json
import os
import re
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import yaml
from parser import OUTPUT_SCHEMES, node_to_clash_config

from utils import NODES_DIR, is_private_host, protocol_of


def _clean_name(name: str) -> str:
    return re.sub(r'[^\w\-_.]', '_', name)[:64]


def _node_info(item):
    """Normalize a node result dict or a raw link string."""
    if isinstance(item, dict):
        return item.get("link"), item.get("region", "unknown"), item.get("latency_ms")
    return item, "unknown", None


def _extract_host_from_link(link: str | None) -> str | None:
    """Extract the server host from a node link.

    复用 node_to_clash_config 的协议分发，避免在这里再维护一份按 scheme
    选 parser 的重复逻辑。
    """
    if not link:
        return None
    cfg = node_to_clash_config(link)
    return cfg.get("server") if cfg else None


def _compute_stats(items: list) -> dict:
    """Compute summary stats from node result dicts or raw link strings."""
    total = len(items)
    has_alive_flag = any(isinstance(i, dict) and "alive" in i for i in items)
    if has_alive_flag:
        alive_items = [i for i in items if isinstance(i, dict) and i.get("alive")]
        candidates = alive_items
        alive_count = len(candidates)
        survival_rate = round(alive_count / total * 100, 1) if total else 0.0
    else:
        # Raw links without verification: liveness is unknown, so we must not
        # report a misleading 100% survival rate.
        candidates = items
        alive_count = None
        survival_rate = None
    latencies = [
        i["latency_ms"] for i in candidates if isinstance(i, dict) and i.get("latency_ms") is not None
    ]
    avg_latency = round(sum(latencies) / len(latencies), 1) if latencies else None
    regions: dict[str, int] = {}
    for i in candidates:
        if isinstance(i, dict):
            region = i.get("region") or "unknown"
        else:
            region = "unknown"
        regions[region] = regions.get(region, 0) + 1
    return {
        "total": total,
        "alive": alive_count,
        "survival_rate": survival_rate,
        "avg_latency": avg_latency,
        "regions": regions,
    }


def _format_stats_lines(stats: dict) -> list[str]:
    alive = stats.get("alive")
    rate = stats.get("survival_rate")
    if alive is None or rate is None:
        lines = [f"# Nodes: {stats['total']} total (unverified)"]
    else:
        lines = [f"# Nodes: {stats['total']} total, {alive} alive ({rate}%)"]
    if stats.get("avg_latency") is not None:
        lines.append(f"# Average latency: {stats['avg_latency']} ms")
    else:
        lines.append("# Average latency: N/A")
    if stats.get("regions"):
        dist = ", ".join(
            f"{k}: {v}" for k, v in sorted(stats["regions"].items(), key=lambda x: -x[1])
        )
        lines.append(f"# Regions: {dist}")
    else:
        lines.append("# Regions: N/A")
    return lines


def _sort_by_latency(items):
    """按 latency_ms 升序排序，None 排最后；保持稳定。

    字符串列表（未验证）保持原顺序，不重排。
    """
    # 全是字符串的未验证列表，原样返回拷贝
    if not any(isinstance(i, dict) for i in items):
        return list(items)

    def _key(item):
        if isinstance(item, dict):
            lat = item.get("latency_ms")
            if lat is None:
                return (1, 0)  # None 排最后
            return (0, lat)
        # 字符串混在 dict 列表里时按 None 处理
        return (1, 0)

    # sorted 是稳定排序，相同 key 保持原相对顺序
    return sorted(items, key=_key)


def to_clash_yaml(items, stats: dict | None = None) -> str:
    # 输出前按延迟排序，延迟低的排前面，None 排最后
    items = _sort_by_latency(items)
    proxies = []
    names = []
    seen_names = set()
    for idx, item in enumerate(items):
        link, region, latency_ms = _node_info(item)
        cfg = node_to_clash_config(link)
        if not cfg or not cfg.get("server") or not cfg.get("port"):
            continue
        if is_private_host(cfg.get("server")):
            continue
        base_name = _clean_name(cfg.get("name") or f"node_{idx + 1}")
        name = base_name
        suffix = 1
        while name in seen_names:
            suffix += 1
            name = f"{base_name}_{suffix}"
        seen_names.add(name)
        cfg["name"] = name
        names.append(name)
        proxies.append(cfg)

    output = {
        "port": 7890,
        "socks-port": 7891,
        "mixed-port": 7892,
        "mode": "rule",
        "log-level": "info",
        "external-controller": "127.0.0.1:9090",
        "proxies": proxies,
        "proxy-groups": [
            {
                "name": "PROXY",
                "type": "select",
                "proxies": names if names else ["DIRECT"],
            }
        ],
        "rules": ["MATCH,DIRECT"],
    }

    disclaimer = [
        "# FreeNode Clash configuration",
        "# Auto-generated. Do not edit manually.",
        "# DISCLAIMER: Free public nodes are for educational and research use only.",
        "# No availability, security, or privacy guarantee. Use at your own risk.",
        "# Do not log in to sensitive accounts through these proxies/nodes.",
    ]

    summary = _compute_stats(items) if stats is None else stats
    disclaimer.extend(_format_stats_lines(summary))

    return "\n".join(disclaimer) + "\n" + yaml.dump(output, allow_unicode=True, sort_keys=False)


def to_v2ray_subscription(items, stats: dict | None = None) -> str:
    if not items:
        return "# FreeNode V2Ray subscription\n# Auto-generated.\n"
    # 输出前按延迟排序，延迟低的排前面，None 排最后
    items = _sort_by_latency(items)
    safe_links = []
    for item in items:
        link, _region, _latency = _node_info(item)
        host = _extract_host_from_link(link)
        if host and not is_private_host(host):
            safe_links.append(link)
    if not safe_links:
        return "# FreeNode V2Ray subscription\n# Auto-generated.\n"
    joined = "\n".join(safe_links)
    return base64.b64encode(joined.encode()).decode()


def to_clash_yaml_by_protocol(items, stats: dict | None = None) -> dict[str, str]:
    """按协议分组生成独立 Clash YAML 字符串。

    返回 ``{"vmess": "...", "vless": "...", ...}``，没有节点的协议不出现，
    由调用方决定是否落盘写 ``nodes/clash-<proto>.yaml``。
    """
    groups: dict[str, list] = {}
    for item in items:
        link = item.get("link") if isinstance(item, dict) else item
        proto = _extract_protocol_from_link(link)
        if not proto:
            continue
        groups.setdefault(proto, []).append(item)

    result: dict[str, str] = {}
    for proto, group_items in groups.items():
        # 每组内同样按延迟排序（to_clash_yaml 内部会再排一次，这里直接传即可）
        result[proto] = to_clash_yaml(group_items, stats=stats)
    return result


def _proxy_host(proxy: str) -> str | None:
    """Extract host from http(s)://host:port or socks4/5://host:port.

    Uses urlparse so IPv6 addresses wrapped in brackets are handled correctly.
    """
    parsed = urlparse(proxy)
    return parsed.hostname


def to_proxy_list(proxies: list[str]) -> str:
    lines = [
        "# FreeNode public proxy list",
        "# Auto-generated.",
        "# DISCLAIMER: Free public proxies are for educational and research use only.",
        "# No availability, security, or privacy guarantee. Use at your own risk.",
        "# Do not log in to sensitive accounts through these proxies.",
    ]
    for proxy in proxies:
        host = _proxy_host(proxy)
        if host and not is_private_host(host):
            lines.append(proxy)
    return "\n".join(lines) + "\n"


def _extract_protocol_from_link(link: str) -> str | None:
    """从分享链接提取协议名（小写），hy2 归一化成 hysteria2。"""
    scheme = protocol_of(link)
    if scheme in OUTPUT_SCHEMES:
        return scheme
    return None


def _compute_protocol_stats(items) -> dict[str, dict]:
    """按协议分组统计 total / alive / survival_rate / avg_latency。"""
    groups: dict[str, list] = {}
    for item in items:
        link = item.get("link") if isinstance(item, dict) else item
        proto = _extract_protocol_from_link(link) or "unknown"
        groups.setdefault(proto, []).append(item)

    result = {}
    for proto, group_items in groups.items():
        total = len(group_items)
        has_alive = any(isinstance(i, dict) and "alive" in i for i in group_items)
        if has_alive:
            alive_count = sum(1 for i in group_items if isinstance(i, dict) and i.get("alive"))
            survival_rate = round(alive_count / total * 100, 1) if total else 0.0
        else:
            alive_count = None
            survival_rate = None
        latencies = [
            i["latency_ms"]
            for i in group_items
            if isinstance(i, dict) and i.get("latency_ms") is not None
        ]
        avg_latency = round(sum(latencies) / len(latencies), 1) if latencies else None
        result[proto] = {
            "total": total,
            "alive": alive_count,
            "survival_rate": survival_rate,
            "avg_latency": avg_latency,
        }
    return result


_FAILURE_REASON_MAP = (
    ("timeout", "timeout"),
    ("timed out", "timeout"),
    ("refused", "connection_refused"),
    ("unreachable", "network_unreachable"),
    ("no route", "network_unreachable"),
    ("reset", "connection_reset"),
)


def _classify_failure_reason(reason: str) -> str:
    """把原始错误字符串归类成标准失败原因 key。"""
    lower = str(reason).lower()
    return next(
        (key for sub, key in _FAILURE_REASON_MAP if sub in lower), "other"
    )


def _compute_failure_reasons(items) -> dict[str, int]:
    """统计验证失败原因分布（只有 verifier 跑过才有）。"""
    reasons: dict[str, int] = {}
    for item in items:
        if not isinstance(item, dict) or item.get("alive"):
            continue
        reason = item.get("error") or item.get("reason") or "unknown"
        key = _classify_failure_reason(reason)
        reasons[key] = reasons.get(key, 0) + 1
    return reasons


def to_quality_report(items, stats: dict | None = None) -> str:
    """生成 nodes/quality.json 内容：每日节点质量报告。"""
    from datetime import UTC, datetime

    summary = stats if stats is not None else _compute_stats(items)
    report = {
        "generated_at": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "summary": {
            "total_nodes": summary.get("total", 0),
            "alive_nodes": summary.get("alive"),
            "survival_rate": summary.get("survival_rate"),
            "avg_latency_ms": summary.get("avg_latency"),
        },
        "by_protocol": _compute_protocol_stats(items),
        "failure_reasons": _compute_failure_reasons(items),
        "regions": summary.get("regions", {}),
    }
    return json.dumps(report, ensure_ascii=False, indent=2)


def _build_regions(items) -> dict[str, list[str]]:
    """Group alive node links by region."""
    regions: dict[str, list[str]] = {}
    for item in items:
        link, region, _latency = _node_info(item)
        cfg = node_to_clash_config(link)
        if not cfg or not cfg.get("server") or is_private_host(cfg.get("server")):
            continue
        regions.setdefault(region, []).append(link)
    return regions


def _atomic_write(path: Path, content: str) -> None:
    """Write *content* to *path* atomically via a temp file + os.replace.

    Prevents half-written / truncated output files if the process is killed
    mid-write (CI timeout, OOM, etc.).
    """
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=path.name + ".", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(content)
        os.replace(tmp, str(path))
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def write_outputs(node_results, proxy_list: list[str], stats: dict | None = None):
    NODES_DIR.mkdir(parents=True, exist_ok=True)

    summary = stats if stats is not None else _compute_stats(node_results)
    stats_header = "\n".join(_format_stats_lines(summary)) + "\n"

    _atomic_write(NODES_DIR / "clash.yaml", to_clash_yaml(node_results, stats=summary))

    v2ray_body = to_v2ray_subscription(node_results)
    if not v2ray_body.startswith("#"):
        v2ray_body = stats_header + v2ray_body
    _atomic_write(NODES_DIR / "v2ray.txt", v2ray_body)

    regions = _build_regions(node_results)
    _atomic_write(
        NODES_DIR / "regions.json",
        json.dumps(regions, ensure_ascii=False, indent=2),
    )

    _atomic_write(NODES_DIR / "proxies.txt", to_proxy_list(proxy_list))

    # 每日节点质量报告：存活率、延迟、协议分布、失败原因
    _atomic_write(NODES_DIR / "quality.json", to_quality_report(node_results, stats=summary))


if __name__ == "__main__":
    sample = [
        "vmess://eyJhZGQiOiJleGFtcGxlLmNvbSIsInBvcnQiOiI0NDMiLCJpZCI6Inh4eHh4eHgteHh4eC14eHh4LXh4eHgteHh4eHh4eHh4eHgiLCJhaWQiOjAsIm5ldCI6InRjcCIsInR5cGUiOiJub25lIiwiaG9zdCI6IiIsInBhdGgiOiIvIiwidGxzIjoiIiwic25pIjoiIiwicHMiOiJ0ZXN0In0=",
        "ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@example.com:443#test",
        "trojan://pass@example.com:443#trojan-test",
    ]
    write_outputs(sample, ["http://127.0.0.1:8080"])
    print("[formatter] output files written")
