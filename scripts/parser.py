from __future__ import annotations

import json
import re
from urllib.parse import parse_qs, unquote

from utils import get_logger, safe_b64decode

logger = get_logger("parser")

# 单条 vmess 链接最多这么长，超长直接拒，配合 safe_b64decode 的输入上限防内存爆炸
MAX_VMESS_LINK_LEN = 512 * 1024

LINK_PATTERNS = [
    r'(?<!\S)ss://[^\s<>"\)]+',
    r'(?<!\S)ssr://[^\s<>"\)]+',
    r'(?<!\S)vmess://[^\s<>"\)]+',
    r'(?<!\S)vless://[^\s<>"\)]+',
    r'(?<!\S)trojan://[^\s<>"\)]+',
    r'(?<!\S)hysteria://[^\s<>"\)]+',
    r'(?<!\S)hysteria2://[^\s<>"\)]+',
    r'(?<!\S)tuic://[^\s<>"\)]+',
]

# Schemes we can fully parse and render to Clash/V2Ray output.
OUTPUT_SCHEMES = {"ss", "vmess", "vless", "trojan", "hysteria", "hysteria2", "tuic"}
# Recognized but unsupported schemes (no Clash config writer); skipped on output.
SKIPPED_SCHEMES = {"ssr"}


def extract_node_links(text: str | None) -> list[str]:
    if not text:
        return []
    links = set()
    skipped: dict[str, int] = {}
    for pattern in LINK_PATTERNS:
        for match in re.findall(pattern, text, re.IGNORECASE):
            link = match.strip()
            scheme = link.split("://", 1)[0].lower()
            if scheme in OUTPUT_SCHEMES:
                links.add(link)
            elif scheme in SKIPPED_SCHEMES:
                skipped[scheme] = skipped.get(scheme, 0) + 1
    if skipped:
        total = sum(skipped.values())
        detail = ", ".join(f"{s}: {c}" for s, c in sorted(skipped.items()))
        logger.info("skipped %d unsupported protocol link(s): %s", total, detail)
    return list(links)


def decode_vmess(link: str) -> dict | None:
    if not link.startswith("vmess://"):
        return None
    # 整条链接先卡一道长度，避免超长 vmess 链接进到 base64 解码
    if len(link) > MAX_VMESS_LINK_LEN:
        logger.warning("vmess link too long (%d chars), rejected", len(link))
        return None
    payload = link[len("vmess://"):]
    decoded = safe_b64decode(payload)
    if not decoded:
        return None
    try:
        return json.loads(decoded.decode("utf-8"))
    except Exception:
        return None


def _split_server_port(server_port: str) -> tuple[str, int] | None:
    """Split 'server:port', supporting IPv6 ``[addr]:port`` and trailing query."""
    if server_port.startswith("["):
        end = server_port.find("]")
        if end == -1:
            return None
        server = server_port[1:end]
        tail = server_port[end + 1:]
        if not tail.startswith(":"):
            return None
        port_str = tail[1:].split("?", 1)[0]
    else:
        if ":" not in server_port:
            return None
        server, port_str = server_port.rsplit(":", 1)
        port_str = port_str.split("?", 1)[0]
    try:
        port = int(port_str)
    except ValueError:
        return None
    return server, port


def parse_ss_link(link: str) -> dict | None:
    """Parse ss:// BASE64(method:password)@server:port#name"""
    if not link.startswith("ss://"):
        return None
    body = link[len("ss://"):]

    # Try standard format with @
    if "@" in body:
        auth_part, rest = body.split("@", 1)
        decoded_auth = safe_b64decode(auth_part)
        if decoded_auth:
            auth = decoded_auth.decode("utf-8", errors="ignore")
        else:
            auth = auth_part
        if ":" not in auth:
            return None
        method, password = auth.split(":", 1)
        if "#" in rest:
            server_port, name = rest.split("#", 1)
            name = unquote(name)
        else:
            server_port, name = rest, None
        parsed = _split_server_port(server_port)
        if parsed is None:
            return None
        server, port = parsed
        return {
            "type": "ss",
            "server": server,
            "port": port,
            "cipher": method,
            "password": password,
            "name": name or "ss_node",
        }

    # Legacy format: ss://BASE64(method:password@server:port)#name
    fragment = ""
    if "#" in body:
        body, fragment = body.split("#", 1)
        fragment = unquote(fragment)
    decoded = safe_b64decode(body)
    if decoded:
        inner = decoded.decode("utf-8", errors="ignore")
        if "@" in inner:
            auth, server_port = inner.rsplit("@", 1)
            if ":" not in auth:
                return None
            method, password = auth.split(":", 1)
            parsed = _split_server_port(server_port)
            if parsed is None:
                return None
            server, port = parsed
            return {
                "type": "ss",
                "server": server,
                "port": port,
                "cipher": method,
                "password": password,
                "name": fragment or "ss_node",
            }
    return None


def _split_link(link: str, scheme: str, default_port: int = 443) -> tuple[str, str, int, str, str] | None:
    """
    Split scheme://[userinfo@]host[:port][?query][#fragment] into parts.
    Supports IPv6 addresses wrapped in brackets.
    """
    prefix = f"{scheme}://"
    if not link.startswith(prefix):
        return None
    body = link[len(prefix):]

    fragment = ""
    if "#" in body:
        body, fragment = body.split("#", 1)

    query = ""
    if "?" in body:
        body, query = body.split("?", 1)

    userinfo = ""
    if "@" in body:
        userinfo, body = body.rsplit("@", 1)

    host = body
    port = default_port
    if host.startswith("["):
        end = host.find("]")
        if end == -1:
            return None
        rest = host[end + 1:]
        host = host[1:end]
        if rest.startswith(":"):
            try:
                port = int(rest[1:])
            except ValueError:
                return None
    elif ":" in host:
        host, port_str = host.rsplit(":", 1)
        try:
            port = int(port_str)
        except ValueError:
            return None

    if not host:
        return None
    return userinfo, host, port, query, fragment


def parse_trojan_link(link: str) -> dict | None:
    parts = _split_link(link, "trojan")
    if not parts:
        return None
    password, host, port, _query, fragment = parts
    return {
        "type": "trojan",
        "server": host,
        "port": port,
        "password": unquote(password),
        "sni": host,
        "skip-cert-verify": False,
        "name": unquote(fragment) or "trojan_node",
    }


def parse_vless_link(link: str) -> dict | None:
    parts = _split_link(link, "vless")
    if not parts:
        return None
    uuid, host, port, query, fragment = parts
    qs = {k: v[0] for k, v in parse_qs(query).items()} if query else {}
    security = qs.get("security", "none")
    cfg = {
        "type": "vless",
        "server": host,
        "port": port,
        "uuid": unquote(uuid),
        "tls": security in ("tls", "reality"),
        "servername": qs.get("sni", host),
        "network": qs.get("type", "tcp"),
        "name": unquote(fragment) or "vless_node",
    }
    flow = qs.get("flow")
    if flow:
        cfg["flow"] = flow
    if security == "reality":
        reality_opts = {}
        pbk = qs.get("pbk")
        if pbk:
            reality_opts["public-key"] = pbk
        sid = qs.get("sid")
        if sid:
            reality_opts["short-id"] = sid
        if reality_opts:
            cfg["reality-opts"] = reality_opts
        fp = qs.get("fp")
        if fp:
            cfg["client-fingerprint"] = fp
    return cfg


def parse_hysteria_link(link: str) -> dict | None:
    """解析 hysteria://host:port?params#remark 链接。

    query 参数主要有 authstr/peer/proxyprotocol/alpn/obfsParam。
    """
    parts = _split_link(link, "hysteria")
    if not parts:
        return None
    _userinfo, host, port, query, fragment = parts
    qs = {k: v[0] for k, v in parse_qs(query).items()} if query else {}
    cfg = {
        "server": host,
        "port": port,
        "password": qs.get("authstr", ""),
        "sni": qs.get("peer", host),
        "obfs": qs.get("obfsParam", ""),
        "name": unquote(fragment) or "hysteria_node",
    }
    # alpn 是逗号分隔，转成列表方便后续拼 clash 配置
    if qs.get("alpn"):
        cfg["alpn"] = qs["alpn"].split(",")
    return cfg


def parse_hysteria2_link(link: str) -> dict | None:
    """解析 hysteria2:// 或 hy2:// 链接。

    query 参数主要有 auth/sni/insecure/obfs/salvo。
    """
    # hy2:// 是 hysteria2 的简写前缀，统一换一下再走解析
    if link.startswith("hy2://"):
        link = "hysteria2://" + link[len("hy2://"):]
    parts = _split_link(link, "hysteria2")
    if not parts:
        return None
    _userinfo, host, port, query, fragment = parts
    qs = {k: v[0] for k, v in parse_qs(query).items()} if query else {}
    cfg = {
        "server": host,
        "port": port,
        "password": qs.get("auth", ""),
        "sni": qs.get("sni", host),
        "skip-cert-verify": qs.get("insecure", "").lower() in ("1", "true"),
        "obfs": qs.get("obfs", ""),
        "name": unquote(fragment) or "hysteria2_node",
    }
    return cfg


def parse_tuic_link(link: str) -> dict | None:
    """解析 tuic://uuid:password@host:port?params#remark 链接。

    query 参数主要有 congestion_control/alpn/sni/allow_insecure/udp_relay_mode。
    """
    parts = _split_link(link, "tuic")
    if not parts:
        return None
    userinfo, host, port, query, fragment = parts
    if ":" not in userinfo:
        return None
    uuid, password = userinfo.split(":", 1)
    qs = {k: v[0] for k, v in parse_qs(query).items()} if query else {}
    alpn = qs["alpn"].split(",") if qs.get("alpn") else []
    cfg = {
        "server": host,
        "port": port,
        "uuid": unquote(uuid),
        "password": unquote(password),
        "sni": qs.get("sni", host),
        "congestion-control": qs.get("congestion_control", ""),
        "udp-relay-mode": qs.get("udp_relay_mode", ""),
        "alpn": alpn,
        "skip-cert-verify": qs.get("allow_insecure", "").lower() in ("1", "true"),
        "name": unquote(fragment) or "tuic_node",
    }
    return cfg


def node_to_clash_config(link: str) -> dict | None:
    scheme = link.split("://", 1)[0].lower()
    if scheme == "vmess":
        cfg = decode_vmess(link)
        if not cfg:
            return None
        try:
            port = int(cfg.get("port") or 0)
            alter_id = int(cfg.get("aid") or 0)
        except (TypeError, ValueError):
            return None
        net = cfg.get("net", "tcp")
        result = {
            "name": cfg.get("ps") or cfg.get("remark") or "vmess_node",
            "type": "vmess",
            "server": cfg.get("add"),
            "port": port,
            "uuid": cfg.get("id"),
            "alterId": alter_id,
            "cipher": cfg.get("scy", "auto"),
            "tls": cfg.get("tls") in ("tls", True, "true"),
            "network": net,
            "skip-cert-verify": False,
        }
        if net == "ws":
            result["ws-opts"] = {
                "path": cfg.get("path", "/"),
                "headers": {"Host": cfg.get("host", "")},
            }
        return result
    if scheme == "ss":
        return parse_ss_link(link)
    if scheme == "trojan":
        return parse_trojan_link(link)
    if scheme == "vless":
        return parse_vless_link(link)
    if scheme == "hysteria":
        cfg = parse_hysteria_link(link)
        if not cfg:
            return None
        result = {
            "name": cfg["name"],
            "type": "hysteria",
            "server": cfg["server"],
            "port": cfg["port"],
            "auth-str": cfg["password"],
            "peer": cfg["sni"],
            "obfs": cfg.get("obfs") or "",
        }
        if cfg.get("alpn"):
            result["alpn"] = cfg["alpn"]
        return result
    if scheme in ("hysteria2", "hy2"):
        cfg = parse_hysteria2_link(link)
        if not cfg:
            return None
        return {
            "name": cfg["name"],
            "type": "hysteria2",
            "server": cfg["server"],
            "port": cfg["port"],
            "password": cfg["password"],
            "sni": cfg["sni"],
            "skip-cert-verify": cfg.get("skip-cert-verify", False),
            "obfs": cfg.get("obfs") or "",
        }
    if scheme == "tuic":
        cfg = parse_tuic_link(link)
        if not cfg:
            return None
        result = {
            "name": cfg["name"],
            "type": "tuic",
            "server": cfg["server"],
            "port": cfg["port"],
            "uuid": cfg["uuid"],
            "password": cfg["password"],
            "sni": cfg["sni"],
            "congestion-controller": cfg.get("congestion-control", ""),
            "udp-relay-mode": cfg.get("udp-relay-mode", ""),
            "skip-cert-verify": cfg.get("skip-cert-verify", False),
        }
        if cfg.get("alpn"):
            result["alpn"] = cfg["alpn"]
        return result
    return None


def parse_proxy_api_response(text: str | None, default_scheme: str = "http") -> list[str]:
    """Parse proxy API/list responses.

    Supports explicit scheme URLs (http/https/socks4/socks5) and plain
    ``host:port`` lines, which are prefixed with *default_scheme*.
    """
    if not text:
        return []
    scheme_pattern = re.compile(r"^(http|https|socks4|socks5)://", re.I)
    ipv4_pattern = re.compile(r"^((?:\d{1,3}\.){3}\d{1,3}):(\d{1,5})\s*$")
    ipv6_pattern = re.compile(r"^(\[[\da-fA-F:.]+\]):(\d{1,5})\s*$")

    def _is_valid_ipv4(host: str) -> bool:
        try:
            return all(0 <= int(octet) <= 255 for octet in host.split("."))
        except ValueError:
            return False

    proxies = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if scheme_pattern.match(line):
            proxies.append(line)
            continue
        match = ipv4_pattern.match(line) or ipv6_pattern.match(line)
        if match:
            host, port_str = match.group(1), match.group(2)
            port = int(port_str)
            if not 1 <= port <= 65535:
                continue
            if "." in host and not _is_valid_ipv4(host):
                continue
            proxies.append(f"{default_scheme}://{host}:{port}")
    return list(dict.fromkeys(proxies))


if __name__ == "__main__":
    sample = (
        "vmess://eyJhZGQiOiJleGFtcGxlLmNvbSIsInBvcnQiOiI0NDMiLCJpZCI6Inh4eHh4eHgteHh4eC14eHh4LXh4eHgteHh4eHh4eHh4eHgiLCJhaWQiOjAsIm5ldCI6InRjcCIsInR5cGUiOiJub25lIiwiaG9zdCI6IiIsInBhdGgiOiIvIiwidGxzIjoiIiwic25pIjoiIiwicHMiOiJ0ZXN0In0= "
        "ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@example.com:443#test "
        "trojan://pass@example.com:443#trojan-test"
    )
    links = extract_node_links(sample)
    print("extracted:", links)
    for link in links:
        print("config:", node_to_clash_config(link))
