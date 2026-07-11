# Node & Proxy Sources

FreeNode aggregates **84+ public sources** every day. Here's what they are and
where they come from.

> All sources are vetted: repositories must be public, actively maintained,
> and distribute nodes under a permissive license. Sources that go dead or
> violate GitHub's ToS are removed.

## Source Types

| Type | Description | Retrieval Method |
|---|---|---|
| `github_raw` | Raw file from a GitHub repository | Direct HTTPS download |
| `web_url` | A plain URL returning subscription text | Standard HTTP GET |
| `html` | A web page; links are parsed from HTML | HTTP GET + HTML parsing |
| `git_repo` | Full git repository cloned at run time | `git clone` |
| `rss` | RSS / Atom feed | Feed parser |

## Featured Sources (by star count)

### ⭐ 40k+ Stars

- **freefq/free** — The largest free proxy collection on GitHub. Base64-encoded
  multi-protocol subscription. Has not been updated since 2024 but the content
  is still referenced widely.

### ⭐ 10-20k Stars

- **aiboboxx/v2rayfree** — Daily-updated VMess/VLESS configs, served as
  date-stamped Base64 subscription files.

### ⭐ 5-10k Stars

- **VPN-Subcription-Links/ClashX-V2Ray-TopFreeProxy** — Aggregator of top free
  VPN services, updated regularly. Outputs Clash-compatible subscriptions.
- **openrunner/clash-freenode** — Large multi-protocol collection with daily
  updates.
- **awesome-vpn/awesome-vpn** — One of the most complete free proxy node
  aggregators. Mixed protocols (VMess/VLESS/SS/Trojan).

### ⭐ 1-5k Stars

- **crossxx-labs/free-proxy** — Clash subscription with ssr/vmess/hysteria2.
- **Barabama/FreeNodes** — V2Ray & Clash scraper with auto-update.
- **snakem982/proxypool** — Proxy pool aggregator (multi-protocol).
- **freefq/free** — Classic free proxy repository.
- **wrfree/free** — Classic free V2Ray and SSR nodes.
- **mfuu/v2ray** — Well-known V2Ray node list.
- **Pawdroid/Free-servers** — Daily updated multi-protocol subscription.
- **learnhard-cn/free_proxy_ss** — Shadowsocks proxy collection.
- **a2470982985/getNode** — Large multi-protocol aggregator.

### ⭐ 100-1000 Stars

- **SnapdragonLee/SystemProxy** — Clash subscription with protocol aggregation.
- **xyfqzy/free-nodes** — Multi-protocol proxies (Clash/V2Ray/SS/Trojan).
- **littlebais/free-proxy-nodes** — Daily aggregator.
- **junjun266/FreeProxyGo** — Updated every 6 hours.
- **mahdibland/V2RayAggregator** — Node aggregator with merge subscriptions.
- **Au1rxx/free-vpn-subscriptions** — Live node status display.
- **qjlxg/aggregator** — V2Ray/Clash node aggregator.
- **Pawdroid/Free-servers** — Stable subscription service.

### Special Mention: Fastest Refresh

- **rtwo2/FastNodes** — Regenerates **50,000+ nodes** daily. Supports all
  protocols. The strongest single-source supplement for high node count.
- **zhuhaiuk/free-nodes** — Updates subscription files **every hour**.

## Proxy List Sources

These are separate from node subscriptions and provide plain HTTP/SOCKS
proxies for everyday use:

- **TheSpeedX/proxy-list** — HTTP, SOCKS4, SOCKS5 lists.
- **ErcinDedeoglu/** — HTTP, HTTPS, SOCKS4, SOCKS5 (multiple repos).
- **jetkai/proxy-list** — HTTP, SOCKS4, SOCKS5.
- **monosans/proxy-list** — HTTP, SOCKS4, SOCKS5 (daily updates).
- **roosterkid/openproxylist** — HTTPS, SOCKS4, SOCKS5.
- **clarketm/proxy-list** — HTTP/HTTPS merged list.
- **ShiftyTR/proxy-list** — HTTP list.
- **mmpx12/proxy-list** — HTTP, SOCKS5.

### Website Proxy Lists

- **spys.me** — Plain-text SOCKS/HTTP proxy list, updated hourly.
- **Geonode** — Free proxy API with country/protocol filtering.

## Source Maintenance

Sources are reviewed periodically. Criteria for removal:

- Repository archived or deleted.
- No updates for 6+ months with declining reliability.
- Content switched to non-proxy material.
- Violates GitHub Terms of Service.
