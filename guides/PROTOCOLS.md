# Proxy Protocols Explained

This guide explains the different proxy protocols this repository collects,
what each is good for, and how they differ.

## SOCKS (SOCKS4 / SOCKS5)

**Type:** Generic proxy  
**Encryption:** None (plain TCP)  
**Typical port:** 1080 / 10808  

The most basic proxy protocol. SOCKS5 supports UDP and authentication;
SOCKS4 does not. Both simply forward TCP connections without encryption.

- **Good for:** Browsing, curl, system-level proxy, proxychains.
- **Bad for:** Anything needing encryption — use a tunnel on top.
- **Clients:** Any SOCKS-capable app, proxychains, redsocks.

## HTTP / HTTPS Proxy

**Type:** Generic proxy  
**Encryption:** None for HTTP; HTTPS is tunneled via CONNECT  
**Typical port:** 3128 / 8080  

HTTP proxies understand HTTP requests. They forward your TCP stream or act as
a gateway. HTTPS proxies use the `CONNECT` method to tunnel TLS traffic.

- **Good for:** Browser configuration, simple scraping.
- **Bad for:** UDP traffic (not supported).
- **Clients:** curl, most browsers.

---

## Shadowsocks (SS)

**Type:** Encrypted tunnel  
**Encryption:** AEAD (aes-256-gcm, chacha20-poly1305, etc.)  
**Typical port:** 443 / 8388 / 3333  
**Link format:** `ss://BASE64(method:password)@server:port#name`

A lightweight encrypted proxy protocol. The client encrypts traffic to a
server-side daemon. SS is widely supported, simple, and fast.

- **Pros:** Very lightweight; runs everywhere (Python, Go, Rust, C).
- **Cons:** Fixed encryption parameters make it fingerprintable.
- **Clients:** shadowsocks-rust, v2rayN, Clash, Shadowrocket, Surge.

## ShadowsocksR (SSR)

**Type:** Encrypted tunnel (legacy fork)  
**Link format:** `ssr://BASE64(...)`

A modified fork of Shadowsocks with obfuscation. **Not recommended** unless
you have a specific SSR-only server — the protocol is outdated and the
implementation has known issues.

---

## VMess

**Type:** Encrypted proxy (V2Ray)  
**Encryption:** AES / Chacha20 + AEAD  
**Typical port:** 443 / 10086  
**Link format:** `vmess://BASE64(JSON config)`

V2Ray's native protocol. Each connection uses a unique session key derived
from a UUID. Supports TCP, WebSocket, gRPC, QUIC transports.

- **Pros:** Strong anti-detection; multiple transport options (ws/grpc/quic).
- **Cons:** Heavier than SS; JSON-based config parsing is slower.
- **Clients:** v2rayN, v2rayNG, Clash, Shadowrocket, Stash.

## VLESS

**Type:** Lightweight encrypted proxy (Xray)  
**Encryption:** TLS / Reality (no native crypto)  
**Link format:** `vless://uuid@server:port?security=tls&type=tcp#name`

An improved VMess without encryption overhead — it relies on an outer TLS
layer or Reality (XTLS). This makes it faster and harder to block.

- **Pros:** Very fast (zero-copy forwarding in XTLS); Reality mode is
  fingerprint-resistant.
- **Cons:** Requires TLS or Reality setup; more complex to configure.
- **Clients:** Xray, v2rayN, Clash.Meta, Shadowrocket, Stash.

## Trojan

**Type:** TLS-tunneled proxy  
**Encryption:** TLS  
**Typical port:** 443  
**Link format:** `trojan://password@server:port#name`

A simple TLS tunnel protected by a password. The client establishes a TLS
connection to the server and sends a password; if correct, traffic is forwarded.

- **Pros:** Simple; looks like HTTPS traffic; hard to block.
- **Cons:** TLS handshake adds latency; password can leak if TLS is broken.
- **Clients:** trojan-go, v2rayN, Clash, Shadowrocket.

---

## Hysteria / Hysteria2

**Type:** QUIC-based proxy  
**Encryption:** TLS + custom  
**Protocol:** QUIC (UDP)  
**Link format:** `hysteria://host:port?params#name` / `hy2://...`

Uses QUIC over UDP to achieve high throughput even on lossy networks.
Excellent for video streaming and bulk downloads.

- **Pros:** Very fast on poor connections; built-in bandwidth estimation.
- **Cons:** UDP-based — some networks block all UDP; uses more battery.
- **Clients:** Hysteria2, sing-box, Clash.Meta, Stash (partial).

## TUIC

**Type:** QUIC-based proxy  
**Encryption:** TLS  
**Protocol:** QUIC (UDP)  
**Link format:** `tuic://uuid:password@host:port?params#name`

Similar to Hysteria but designed for lower latency. Congestion control
is user-configurable (BBR, Cubic, etc.).

- **Pros:** Very low latency; flexible congestion control.
- **Cons:** Newer protocol — fewer client implementations.
- **Clients:** sing-box, Clash.Meta (partial).

---

## Quick Comparison Table

| Protocol | Encryption | Transport | Speed | Anti-block | Clients |
|---|---|---|---|---|---|
| SOCKS5 | None | TCP | ⭐⭐⭐ | ⭐ | All |
| HTTP/HTTPS | None | TCP | ⭐⭐⭐ | ⭐ | All |
| Shadowsocks (SS) | AEAD | TCP | ⭐⭐⭐ | ⭐⭐ | All |
| SSR | AEAD | TCP | ⭐⭐ | ⭐⭐ | Few |
| VMess | AEAD | TCP+UDP | ⭐⭐ | ⭐⭐⭐⭐ | Many |
| VLESS | TLS/Reality | TCP+UDP | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Xray, Clash |
| Trojan | TLS | TCP | ⭐⭐⭐ | ⭐⭐⭐⭐ | Many |
| Hysteria2 | TLS | QUIC | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Hysteria2, sing-box |
| TUIC | TLS | QUIC | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | sing-box, Clash.Meta |

## What You Can Actually Use

This repository's daily output gives you:

| File | Contents |
|---|---|
| `nodes/clash.yaml` | All supported protocols formatted for Clash clients |
| `nodes/v2ray.txt` | Share links (vmess://, vless://, ss://, trojan://) |
| `nodes/proxies.txt` | Plain proxy list (http://, socks4://, socks5://) |

Paste the link into your client — no manual config needed.
