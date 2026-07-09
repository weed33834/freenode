# Project Overview

FreeNode is a community-maintained aggregator of public proxy and node lists. It runs a daily pipeline that fetches publicly available subscription files, parses them, optionally verifies connectivity, and publishes the result in three formats. The project itself does not operate any proxy or VPN servers — it only aggregates and reformats public resources.

This page is the landing doc for the project: what it does, how it's built, and how to use it. Other pages in the sidebar go deeper on each topic.

## What FreeNode is

A pipeline, not a service. The core is a Python script (`scripts/update.py`) that:

1. Reads `config/sources.json` — a hand-curated list of public data sources.
2. Fetches each enabled source concurrently (default 16 workers).
3. Decodes Base64 if needed, extracts node links (`vmess://`, `vless://`, `ss://`, `trojan://`) and proxy entries.
4. Optionally verifies each node by TCP `connect()` to `server:port` with a 5s timeout.
5. Writes the deduplicated, verified set to `nodes/` in three formats.

The pipeline runs daily on GitHub Actions (UTC 02:00) and on every self-hosted backend via APScheduler. Output is committed to the repo, so the subscription URLs are just raw file links — no server-side compute needed to serve them.

## What FreeNode is not

- **Not a VPN or proxy provider.** We don't run any servers. All nodes come from third-party public sources.
- **Not an anonymity tool.** Free public nodes are operated by strangers. Assume traffic can be logged. Never use them for anything sensitive.
- **Not a bypass tool.** The project is for protocol learning, security research, and network testing. Follow your local laws.

## Features

### Daily automatic pipeline

A GitHub Actions workflow (`update-nodes.yml`) runs the full pipeline every day. Results land in `nodes/` and are pushed to both GitHub and GitCode mirrors. No manual intervention needed.

### Three output formats

| Format | File | Use case |
|---|---|---|
| Clash YAML | `nodes/clash.yaml` | Clash / Mihomo / Clash Verge / Stash |
| V2Ray subscription | `nodes/v2ray.txt` | v2rayN / v2rayNG / Shadowrocket / Karing |
| Plain proxy list | `nodes/proxies.txt` | HTTP(S) / SOCKS4 / SOCKS5 clients, curl `--proxy` |

The V2Ray file is Base64-encoded as the subscription spec requires. The Clash file includes proxy groups and a `MATCH,DIRECT` rule so it works out of the box.

### Connectivity verification

Set `FREENODE_VERIFY_NODES=true` and the pipeline will TCP-connect to each node before publishing. Dead nodes are filtered out. The verifier supports 50 concurrent workers by default and a 5s per-node timeout, so verifying ~1000 candidates takes about a minute. Verification stats (survival rate, average latency, failure reasons) are logged and written to `nodes/quality.json`.

### Quality and reliability reports

Two JSON reports are written alongside the subscription files:

- **`nodes/quality.json`** — daily snapshot: total nodes, alive count, survival rate, average latency, breakdown by protocol, failure-reason distribution, region distribution.
- **`nodes/sources-report.json`** — 14-day rolling reliability score per source, with daily history. Drives the auto-Issue workflow that opens tickets for sources failing 3+ days in a row.

### Source health automation

The `source-check.yml` workflow runs after each daily update. If a source has failed for 3+ consecutive days, it opens (or updates) a GitHub Issue tagged `auto-source-health`. When the source recovers, the Issue auto-closes. This means broken sources get noticed without manual monitoring.

### Bilingual docs

The documentation site (this site) is in Chinese for the core audience. README is English-first with a Chinese mirror (`README.zh-CN.md`). Governance, contributing, and security docs are English-first for international contributors.

### Self-hostable

The full stack — FastAPI backend, Next.js frontend, Caddy reverse proxy — runs in Docker Compose with one command. See [部署说明](/deployment).

## How to use it

### As a consumer (just want the nodes)

Pick a format and copy the raw URL into your client's subscription field:

| Format | URL |
|---|---|
| Clash | `https://raw.githubusercontent.com/MS33834/freenode/main/nodes/clash.yaml` |
| V2Ray | `https://raw.githubusercontent.com/MS33834/freenode/main/nodes/v2ray.txt` |
| Proxies | `https://raw.githubusercontent.com/MS33834/freenode/main/nodes/proxies.txt` |

GitCode mirror (use this if GitHub Raw is rate-limited in your region):

| Format | URL |
|---|---|
| Clash | `https://api.gitcode.com/api/v5/repos/badhope/freenode/raw/nodes/clash.yaml?ref=main` |
| V2Ray | `https://api.gitcode.com/api/v5/repos/badhope/freenode/raw/nodes/v2ray.txt?ref=main` |
| Proxies | `https://api.gitcode.com/api/v5/repos/badhope/freenode/raw/nodes/proxies.txt?ref=main` |

See [客户端配置](/client-setup/clash) for step-by-step client setup guides.

### As a developer (run the pipeline locally)

```bash
git clone https://github.com/MS33834/freenode.git
cd freenode
pip3 install -r requirements.txt

# Run without verification (fast, outputs all parsed nodes)
python3 scripts/update.py --no-verify

# Run with verification (slower, filters dead nodes)
FREENODE_VERIFY_NODES=true python3 scripts/update.py --verify
```

Output lands in `nodes/`. Tune limits via environment variables:

| Variable | Default | Meaning |
|---|---|---|
| `FREENODE_MAX_NODES` | 500 | Max nodes in the output files |
| `FREENODE_MAX_PROXIES` | 200 | Max proxies in the output files |
| `FREENODE_VERIFY_NODES` | true | Whether to verify connectivity |
| `FREENODE_VERIFY_TIMEOUT` | 5 | Per-node TCP connect timeout (seconds) |
| `FREENODE_VERIFY_WORKERS` | 50 | Concurrent verification workers |
| `FREENODE_GEO_ENABLED` | false | Whether to resolve node regions (adds latency) |
| `FREENODE_CRAWL_WORKERS` | 16 | Concurrent fetch workers for sources |
| `FREENODE_FETCH_TIMEOUT` | 20 | Per-source fetch timeout (seconds) |
| `FREENODE_FETCH_RETRIES` | 1 | Retries per source on transient failure |

### As an operator (self-host the full stack)

The full stack — backend API + scheduler, frontend, reverse proxy with HTTPS — runs in Docker Compose. See [部署说明](/deployment) for the complete guide. Short version:

```bash
cd backend
cp .env.example .env
# Edit .env: set FREENODE_ADMIN_API_KEY and FREENODE_SECRET_KEY_HEX
# Edit Caddyfile: replace freenode.example.com with your domain
docker compose up -d
```

### As a contributor (add a source or fix something)

- Adding a data source: see [数据源贡献指南](/data-source-guide).
- Reporting a bug or proposing a feature: see [参与贡献](/contributing).
- Understanding the architecture: see [项目架构](/architecture).

## Architecture at a glance

```
config/sources.json
        │
        ▼
   scripts/crawler.py  ──fetch──▶  78 public sources (GitHub Raw / web)
        │
        ▼
   scripts/parser.py   ──extract──▶ vmess/vless/ss/trojan links + proxies
        │
        ▼
   scripts/verifier.py ──TCP connect──▶ filter dead nodes
        │
        ▼
   scripts/formatter.py ──write──▶ nodes/clash.yaml, v2ray.txt, proxies.txt,
                                     regions.json, quality.json
        │
        ▼
   scripts/update.py  (also _write_source_report → sources-report.json)
```

The backend (`backend/app/`) mirrors this pipeline in `pipeline_service.py` so the same logic runs via the API and scheduler, writing into a database for the frontend to query.

## Project status and direction

The project is stable and runs daily. For what's already done, see [更新日志](https://github.com/MS33834/freenode/blob/main/CHANGELOG.md). For directions we might explore — smarter source discovery, protocol-level verification, pluggable adapters, decentralized distribution — see [未来方向](/future-directions). Those are exploratory ideas, not promises.
