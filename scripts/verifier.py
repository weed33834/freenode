from __future__ import annotations

import ipaddress
import json
import os
import socket
import ssl
import threading
import time
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse

from cachetools.func import ttl_cache
from parser import decode_vmess, parse_ss_link, parse_trojan_link, parse_vless_link

from utils import get_logger, is_private_host, protocol_of

TIMEOUT = 5
MAX_WORKERS = 50
GEO_TIMEOUT = 5
GEO_MIN_INTERVAL = 1.5  # seconds; stay below ip-api free tier (≈45/min)
MAX_GEO_RESPONSE_SIZE = 65536  # 64 KiB

logger = get_logger("verifier")


def _to_valid_port(port_raw) -> int | None:
    """Convert a raw port value to an int in the valid 1-65535 range."""
    if port_raw is None:
        return None
    try:
        port = int(str(port_raw).strip())
    except (TypeError, ValueError):
        return None
    return port if 1 <= port <= 65535 else None


_geo_lock = threading.Lock()
_last_geo_request = 0.0


def can_reach_public_internet(timeout: int = 5) -> bool:
    """Check if the environment can make outbound TCP connections."""
    for host, port in [("1.1.1.1", 53), ("example.com", 443)]:
        try:
            with socket.create_connection((host, port), timeout=timeout):
                return True
        except Exception:
            continue
    return False


def tcp_check(host: str, port: int, timeout: int = TIMEOUT) -> tuple[bool, float, str | None]:
    """Measure TCP connect time and return (success, latency_ms, error_reason).

    The error_reason categorizes failures so callers can report *why* a node
    could not be reached:
      - ``timeout``: the connect attempt exceeded the timeout.
      - ``connection refused``: the host actively rejected the connection.
      - ``network error: <detail>``: any other socket-level failure.
      - ``error: <type>``: an unexpected non-socket exception.
    """
    start = time.perf_counter()
    try:
        with socket.create_connection((host, port), timeout=timeout):
            latency_ms = (time.perf_counter() - start) * 1000
            return True, latency_ms, None
    except TimeoutError:
        return False, float("inf"), "timeout"
    except ConnectionRefusedError:
        return False, float("inf"), "connection refused"
    except OSError as exc:
        detail = exc.strerror or str(exc) or "unknown"
        return False, float("inf"), f"network error: {detail}"
    except Exception as exc:
        return False, float("inf"), f"error: {type(exc).__name__}"


def parse_endpoint(link: str) -> tuple[str | None, int | None]:
    scheme = link.split("://", 1)[0].lower()
    try:
        if scheme == "vmess":
            cfg = decode_vmess(link)
            if not cfg:
                return None, None
            host = cfg.get("add")
            port = _to_valid_port(cfg.get("port"))
            return host, port
        if scheme == "vless":
            cfg = parse_vless_link(link)
            if not cfg:
                return None, None
            return cfg.get("server"), cfg.get("port")
        if scheme == "trojan":
            cfg = parse_trojan_link(link)
            if not cfg:
                return None, None
            return cfg.get("server"), cfg.get("port")
        if scheme == "ss":
            cfg = parse_ss_link(link)
            if not cfg:
                return None, None
            return cfg.get("server"), cfg.get("port")
        parsed = urlparse(link)
        return parsed.hostname, parsed.port
    except Exception:
        return None, None


def resolve_ip(host: str, timeout: int = 3) -> str | None:
    """Resolve a hostname to an IP address; return IPs unchanged.

    Uses a thread-level timeout (``Future.result``) instead of mutating the
    global ``socket.setdefaulttimeout`` so concurrent verifications don't race.
    """
    try:
        ipaddress.ip_address(host)
        return host
    except ValueError:
        pass

    def _resolve(family: int) -> str | None:
        infos = socket.getaddrinfo(host, None, family, socket.SOCK_STREAM)
        return infos[0][4][0] if infos else None

    for family in (socket.AF_INET, socket.AF_INET6):
        try:
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(_resolve, family)
                result = future.result(timeout=timeout)
                if result:
                    return result
        except Exception:
            continue
    return None


def _geo_request(url: str) -> dict:
    """Fetch a geo-API URL while enforcing a minimum request interval."""
    global _last_geo_request
    with _geo_lock:
        now = time.monotonic()
        next_time = max(now, _last_geo_request + GEO_MIN_INTERVAL)
        _last_geo_request = next_time
    wait = next_time - now
    if wait > 0:
        time.sleep(wait)

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "FreeNode-Verifier/1.0"},
    )
    with urllib.request.urlopen(req, timeout=GEO_TIMEOUT) as resp:
        raw = resp.read(MAX_GEO_RESPONSE_SIZE)
        return json.loads(raw.decode("utf-8", errors="ignore"))


def _format_geo(data: dict) -> str:
    """Extract a human-readable region string from geo API response."""
    if not data:
        return "unknown"
    country = data.get("country") or data.get("country_name") or ""
    region = data.get("regionName") or data.get("region") or ""
    if country and region and region != country:
        return f"{country}/{region}"
    return country or "unknown"


def _fetch_geo_data(ip: str) -> dict:
    """Try free IP geo APIs in order; return {} on failure.

    Uses HTTPS-capable endpoints (ip-api.com's free tier is HTTP-only, so it
    is replaced with ipwho.is which supports HTTPS at no cost).
    """
    try:
        data = _geo_request(f"https://ipwho.is/{ip}")
        if data.get("success") or data.get("country"):
            return data
    except Exception:
        pass

    try:
        data = _geo_request(f"https://ipapi.co/{ip}/json/")
        if data.get("country") or data.get("country_name"):
            return data
    except Exception:
        pass

    return {}


@ttl_cache(maxsize=4096, ttl=86400)
def query_geo_api(ip: str) -> str:
    """Return region for an IP, cached 24h; falls back to 'unknown'.

    ttl_cache 自带线程安全 + 自动过期，替代原先手写无界 dict 缓存。
    """
    if not ip or is_private_host(ip):
        return "private"
    return _format_geo(_fetch_geo_data(ip))


def verify_node(link: str, timeout: int = TIMEOUT, geo_enabled: bool = True) -> dict:
    host, port = parse_endpoint(link)
    if not host or not port:
        return {
            "link": link,
            "alive": False,
            "latency": None,
            "latency_ms": None,
            "region": "unknown",
            "error": "parse failed",
        }

    # SSRF defence: never connect to private/loopback/link-local hosts.
    if is_private_host(host):
        return {
            "link": link,
            "alive": False,
            "latency": None,
            "latency_ms": None,
            "region": "private",
            "error": "private host blocked",
        }

    # DNS rebinding defence: 先解析 IP 并校验，避免对内网地址发起 TCP 连接。
    # 注意 tcp_check 内部仍会再次解析，存在理论 TOCTOU，但已能挡住 DNS 静态指向内网的攻击。
    ip = resolve_ip(host)
    if ip and is_private_host(ip):
        return {
            "link": link,
            "alive": False,
            "latency": None,
            "latency_ms": None,
            "region": "private",
            "error": "resolved to private IP",
        }

    alive, latency_ms, error = tcp_check(host, port, timeout)
    latency_ms = int(round(latency_ms)) if alive else None

    if alive:
        region = query_geo_api(ip) if (geo_enabled and ip) else "unknown"
    else:
        region = "unknown"

    return {
        "link": link,
        "alive": alive,
        "latency": round(latency_ms / 1000, 3) if latency_ms is not None else None,
        "latency_ms": latency_ms,
        "region": region,
        "error": error,
    }


def _protocol_scheme(link: str) -> str | None:
    """从分享链接取协议名（小写），hy2 归一化成 hysteria2。"""
    return protocol_of(link)


_VERIFY_METHODS = {"ss": "ss_probe", "trojan": "tls_handshake"}


def _verify_method_for_scheme(scheme: str | None) -> str:
    """根据协议返回对应的 verify_method 标签，用于失败时也带上方法名。"""
    return _VERIFY_METHODS.get(scheme, "tcp_only")


def verify_node_protocol(link: str, timeout: float = 5.0) -> dict:
    """二段协议级握手验证：先 TCP connect，再按协议做轻量握手。

    各协议策略：
      - vmess/vless：完整协议握手太复杂，只到 TCP 层 + 端口可达。
      - ss：TCP 连上后发一个字节探测，立即 RST 视为密码/加密方式不对。
      - trojan：跑 TLS 握手，握手成功说明证书和端口都对。
      - hysteria/hysteria2/tuic：UDP/QUIC 系，TCP 探测无意义，只标 tcp_only。

    成功返回 ``{"alive": True, "latency_ms": ..., "verify_method": ...}``，
    失败返回 ``{"alive": False, "latency_ms": None, "error": "...", "verify_method": ...}``。
    """
    host, port = parse_endpoint(link)
    scheme = _protocol_scheme(link)
    if not host or not port or not scheme:
        return {
            "alive": False,
            "latency_ms": None,
            "error": "parse failed",
            "verify_method": "unknown",
        }

    # SSRF 防御：私网/回环节点直接拒。DNS rebinding 由 verify_node 负责，
    # 这里不再做一次（verify_node_protocol 通常在 verify_node 之后跑）。
    if is_private_host(host):
        return {
            "alive": False,
            "latency_ms": None,
            "error": "private host blocked",
            "verify_method": "unknown",
        }

    # 第一段：TCP connect
    start = time.perf_counter()
    try:
        sock = socket.create_connection((host, port), timeout=timeout)
    except TimeoutError:
        return {
            "alive": False,
            "latency_ms": None,
            "error": "timeout",
            "verify_method": _verify_method_for_scheme(scheme),
        }
    except ConnectionRefusedError:
        return {
            "alive": False,
            "latency_ms": None,
            "error": "connection refused",
            "verify_method": _verify_method_for_scheme(scheme),
        }
    except OSError as exc:
        detail = exc.strerror or str(exc) or "unknown"
        return {
            "alive": False,
            "latency_ms": None,
            "error": f"network error: {detail}",
            "verify_method": _verify_method_for_scheme(scheme),
        }
    except Exception as exc:
        return {
            "alive": False,
            "latency_ms": None,
            "error": f"error: {type(exc).__name__}",
            "verify_method": _verify_method_for_scheme(scheme),
        }

    latency_ms = int(round((time.perf_counter() - start) * 1000))

    try:
        # TCP-only 协议：vmess/vless 协议握手太复杂；UDP 系协议 TCP 探测无意义
        if scheme in ("vmess", "vless", "hysteria", "hysteria2", "tuic"):
            return {"alive": True, "latency_ms": latency_ms, "verify_method": "tcp_only"}

        if scheme == "ss":
            # ss：发一字节探测，立即 RST 视为密码/加密方式不对
            try:
                sock.settimeout(timeout)
                sock.send(b"\x00")
                try:
                    sock.recv(1)
                    # 收到回包（少见）也算活
                    return {"alive": True, "latency_ms": latency_ms, "verify_method": "ss_probe"}
                except ConnectionResetError:
                    # 立即 RST 说明握手不对
                    return {
                        "alive": False,
                        "latency_ms": None,
                        "error": "ss probe reset (likely bad auth)",
                        "verify_method": "ss_probe",
                    }
                except TimeoutError:
                    # 没回包也没 RST，端口活着，保守认为活
                    return {"alive": True, "latency_ms": latency_ms, "verify_method": "ss_probe"}
                except OSError as exc:
                    detail = exc.strerror or str(exc) or "unknown"
                    return {
                        "alive": False,
                        "latency_ms": None,
                        "error": f"ss probe error: {detail}",
                        "verify_method": "ss_probe",
                    }
            except ConnectionResetError:
                return {
                    "alive": False,
                    "latency_ms": None,
                    "error": "ss probe reset on send",
                    "verify_method": "ss_probe",
                }
            except OSError as exc:
                detail = exc.strerror or str(exc) or "unknown"
                return {
                    "alive": False,
                    "latency_ms": None,
                    "error": f"ss probe send error: {detail}",
                    "verify_method": "ss_probe",
                }

        if scheme == "trojan":
            # trojan 跑 TLS，握手成功说明证书和端口都对。
            # 不少自签证书节点，放宽校验避免误杀（探测目的是判断端口活不活）。
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            try:
                with ctx.wrap_socket(sock, server_hostname=host):
                    pass
                return {
                    "alive": True,
                    "latency_ms": latency_ms,
                    "verify_method": "tls_handshake",
                    "tls_verified": True,
                }
            except ssl.SSLError as exc:
                return {
                    "alive": False,
                    "latency_ms": None,
                    "error": f"tls handshake failed: {exc}",
                    "verify_method": "tls_handshake",
                }
            except OSError as exc:
                detail = exc.strerror or str(exc) or "unknown"
                return {
                    "alive": False,
                    "latency_ms": None,
                    "error": f"tls error: {detail}",
                    "verify_method": "tls_handshake",
                }

        # 未知协议，TCP 通就行
        return {"alive": True, "latency_ms": latency_ms, "verify_method": "tcp_only"}
    finally:
        try:
            sock.close()
        except OSError:
            pass


def verify_nodes(
    links: list[str],
    max_workers: int = MAX_WORKERS,
    geo_enabled: bool = True,
    timeout: int = TIMEOUT,
    verify_level: str = "tcp",
) -> list[dict]:
    # 环境变量 FREENODE_VERIFY_LEVEL 可覆盖默认 verify_level
    env_level = os.environ.get("FREENODE_VERIFY_LEVEL", "").strip().lower()
    if env_level in ("tcp", "protocol"):
        verify_level = env_level

    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_link = {
            executor.submit(verify_node, link, timeout, geo_enabled): link for link in links
        }
        for future in as_completed(future_to_link):
            try:
                result = future.result()
                # 二段协议验证：TCP 成功的节点再跑协议握手
                if verify_level == "protocol" and result.get("alive"):
                    proto_result = verify_node_protocol(result["link"], timeout=float(timeout))
                    result["verify_method"] = proto_result.get("verify_method")
                    if not proto_result.get("alive"):
                        result["alive"] = False
                        result["latency_ms"] = None
                        result["latency"] = None
                        result["error"] = proto_result.get("error") or "protocol verify failed"
                    else:
                        # 协议验证成功的，更新延迟（含握手时间，更准）
                        if proto_result.get("latency_ms") is not None:
                            result["latency_ms"] = proto_result["latency_ms"]
                            result["latency"] = round(proto_result["latency_ms"] / 1000, 3)
                        if proto_result.get("tls_verified"):
                            result["tls_verified"] = True
                else:
                    result["verify_method"] = "tcp_only"
                results.append(result)
            except Exception as exc:
                link = future_to_link[future]
                logger.warning("verification failed for %s: %s", link, exc)
                results.append(
                    {
                        "link": link,
                        "alive": False,
                        "latency": None,
                        "latency_ms": None,
                        "region": "unknown",
                        "error": f"error: {type(exc).__name__}",
                        "verify_method": "tcp_only",
                    }
                )
    return results


def stats_summary(results: list[dict], verify_level: str = "tcp") -> dict:
    """Compute survival rate, average latency and region distribution.

    Also aggregates ``failed`` count and ``failure_reasons`` so callers can
    report how many nodes failed and *why* (timeout / connection refused /
    network error / parse failed / other). ``verify_level`` 透传到结果里，
    方便日志和报告标注当前用的是 tcp 还是 protocol 验证。
    """
    total = len(results)
    alive = [r for r in results if r.get("alive")]
    alive_count = len(alive)
    failed_count = total - alive_count
    latencies = [r["latency_ms"] for r in alive if r.get("latency_ms") is not None]
    avg_latency = round(sum(latencies) / len(latencies), 1) if latencies else None

    regions = Counter(r.get("region") or "unknown" for r in alive)

    failure_reasons = Counter(
        r.get("error") or "unknown" for r in results if not r.get("alive")
    )

    survival_rate = round(alive_count / total * 100, 1) if total else 0.0
    return {
        "total": total,
        "alive": alive_count,
        "failed": failed_count,
        "survival_rate": survival_rate,
        "avg_latency": avg_latency,
        "regions": dict(regions),
        "failure_reasons": dict(failure_reasons),
        "verify_level": verify_level,
    }


if __name__ == "__main__":
    sample = [
        "ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@example.com:443",
        "trojan://pass@example.com:443",
        "vmess://eyJhZGQiOiJleGFtcGxlLmNvbSIsInBvcnQiOiI0NDMiLCJpZCI6Inh4eHh4eHgteHh4eC14eHh4LXh4eHgteHh4eHh4eHh4eHgifQ==",
    ]
    for r in verify_nodes(sample, geo_enabled=True):
        print(r)
