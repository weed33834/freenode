# FreeNode

> **English** · [中文](README.zh-CN.md) · [日本語](README.ja.md)

A collection repository of **public, free proxy / node sources**. An automated
pipeline fetches, parses, verifies, and formats node lists from community
sources into subscription files that you can load directly into a client. The
repository is updated every day by GitHub Actions — no server, no database.

> **Disclaimer.** This project is for network-protocol learning, security
> testing, and privacy-technique research only. All nodes come from third-party
> public channels; we do not own, operate, or guarantee them. Do not use these
> nodes for banking, payments, or any sensitive login. Follow the laws that
> apply to you.

## Table of Contents

- [Subscription Links](#subscription-links)
- [How It Works](#how-it-works)
- [Quick Start](#quick-start)
- [Tools](#tools)
  - [update.py — run the pipeline](#updatepy--run-the-pipeline)
  - [discover_sources.py — find new sources](#discover_sourcespy--find-new-sources)
  - [telegram_source.py — scrape a Telegram channel](#telegram_sourcepy--scrape-a-telegram-channel)
  - [crawler.py — concurrent fetcher](#crawlerpy--concurrent-fetcher)
  - [parser.py — link parsing](#parserpy--link-parsing)
  - [verifier.py — connectivity check](#verifierpy--connectivity-check)
  - [dedup.py — de-duplication](#deduppy--de-duplication)
  - [formatter.py — output formatting](#formatterpy--output-formatting)
  - [utils.py — shared helpers](#utilspy--shared-helpers)
- [Configuration](#configuration)
  - [sources.json](#sourcesjson)
  - [Environment variables](#environment-variables)
- [Output Files](#output-files)
- [Automated Daily Update](#automated-daily-update)
- [Guides](#guides)
- [Development](#development)
- [License](#license)
- [Other Languages](#other-languages)

## Subscription Links

Paste any of these into your client's subscription box (Clash / Clash Verge /
Stash / v2rayN / v2rayNG / Shadowrocket / Karing, etc.). The files are
rewritten by the daily workflow, so subscribing is more reliable than copying
the content by hand.

| Format | Clients | Link |
|---|---|---|
| Clash | Clash / Clash Verge / Stash | `https://raw.githubusercontent.com/MS33834/freenode/main/nodes/clash.yaml` |
| V2Ray | v2rayN / v2rayNG / Karing | `https://raw.githubusercontent.com/MS33834/freenode/main/nodes/v2ray.txt` |
| Proxy list | HTTP(S) / SOCKS4 / SOCKS5 clients | `https://raw.githubusercontent.com/MS33834/freenode/main/nodes/proxies.txt` |

Public nodes expire quickly. If a link looks dead, wait for the next daily
run rather than editing the file yourself.

## How It Works

The pipeline is a straight line of small, single-purpose steps. Each step reads
the previous step's output and writes the next:

```
config/sources.json
        │
        ▼
   crawler        fetch every enabled source concurrently (httpx, streaming)
        │
        ▼
   parser         pull node/proxy share links out of the raw text
        │
        ▼
   dedup          collapse mirror duplicates by content fingerprint
        │
        ▼
   verifier  *(optional)*   TCP + lightweight protocol handshake
        │
        ▼
   formatter      write clash.yaml / v2ray.txt / proxies.txt + reports
        │
        ▼
   nodes/   committed back to the repo by the daily workflow
```

`update.py` drives the whole chain; the other modules are imported by it. You
normally only call `update.py` (or `discover_sources.py` / `telegram_source.py`
for the auxiliary jobs).

## Quick Start

```bash
git clone https://github.com/MS33834/freenode.git
cd freenode
pip install -r requirements.txt

# fast run, no connectivity check
python scripts/update.py --no-verify

# thorough run: verify reachability and drop dead nodes
python scripts/update.py --verify
```

Results land in `nodes/` (see [Output Files](#output-files)).

## Tools

Every script lives in `scripts/`. Three of them are real command-line tools;
the rest are pipeline modules that `update.py` imports.

### update.py — run the pipeline

The main entry point. It loads `config/sources.json`, crawls every enabled
source, extracts and de-duplicates links, optionally verifies them, then
writes all output files and updates the 14-day per-source reliability report.

```bash
python scripts/update.py --verify      # verify reachability, drop dead nodes
python scripts/update.py --no-verify   # skip verification (fastest)
```

| Flag | Meaning |
|---|---|
| `--verify` / `--no-verify` | Override the `FREENODE_VERIFY_NODES` env var. Verification is auto-skipped when the environment has no outbound internet (e.g. some CI runners). |

Exit codes: `0` success · `2` configuration error · `3` fetch error ·
`4` parse error.

What it does internally, in order:

1. `crawl()` — fetch all enabled sources at once.
2. `extract_node_links()` / `parse_proxy_api_response()` — pull links.
3. `dedup_by_fingerprint()` — remove mirror copies.
4. `verify_nodes()` — only when verification is on.
5. `write_outputs()` — write the three subscription files + `quality.json`.
6. `_write_source_report()` — roll the 14-day reliability scores.

### discover_sources.py — find new sources

Scans GitHub for repositories that look like free-node sources, then writes
candidates to `nodes/discovered-sources.json` with `enabled: false` so nothing
goes live until you review it and copy the good ones into `sources.json`.

```bash
GITHUB_TOKEN=ghp_xxx python scripts/discover_sources.py --min-stars 50
```

| Flag | Default | Meaning |
|---|---|---|
| `--query` | built-in keywords | Override the GitHub search query. |
| `--min-stars` | `5` | Minimum stars a repo must have. |
| `--max-results` | `30` | Max repositories to pull. |
| `--output` | `nodes/discovered-sources.json` | Where to write candidates. |

Set `GITHUB_TOKEN` to raise the GitHub Search rate limit; without it you will
hit the anonymous limit quickly.

### telegram_source.py — scrape a Telegram channel

Independent tool (not wired into the main pipeline). Reads a channel's recent
messages, extracts node links, and prints or saves them as JSON. Needs
[Telethon](https://docs.telethon.dev/) and a one-time logged-in session.

```bash
# first, log in once (creates ~/.freenode/freenode.session)
python3 -m telethon_quickstart
# then scrape
python scripts/telegram_source.py @some_channel --limit 200 --output nodes/telegram.json
```

| Flag | Default | Meaning |
|---|---|---|
| `channel` *(positional)* | — | Channel username (`@xxx`), `t.me/...` link, or channel ID. |
| `--limit` | `100` | How many recent messages to scan. |
| `--session` | `freenode` | Telethon session name, stored under `~/.freenode/`. |
| `--output` | stdout | JSON output path; prints to terminal if omitted. |

### crawler.py — concurrent fetcher

Library module. `crawl()` opens every enabled source in parallel with
[httpx](https://www.python-httpx.org/), streams the body with a hard
`max_bytes` cap, and retries on transient errors. It auto-detects and decodes
whole-file Base64, and drops sources whose 14-day reliability score falls below
`FREENODE_RELIABILITY_FLOOR`. Not run directly — imported by `update.py`.

Key functions: `crawl()`, `fetch_source()`, `fetch()` (retry wrapper),
`maybe_decode_base64()`, `_fetch_with_httpx()` (bounded streaming).

### parser.py — link parsing

Library module. Turns raw text and proxy-API responses into structured node
links.

- `extract_node_links()` — grab every share link from a blob of text.
- `parse_ss_link()` / `parse_trojan_link()` / `parse_vless_link()` /
  `parse_hysteria_link()` / `parse_hysteria2_link()` / `parse_tuic_link()` /
  `decode_vmess()` — per-protocol parsers.
- `parse_proxy_api_response()` — handle proxy-API / list style responses.
- `node_to_clash_config()` — render a link as a Clash config entry.

### verifier.py — connectivity check

Library module. Decides which nodes are actually usable.

- `tcp_check()` — TCP connect latency in ms.
- `verify_node_protocol()` — two-stage check: TCP connect, then a lightweight
  protocol-level handshake.
- `verify_nodes()` — run the above over a batch.
- `stats_summary()` — survival rate, average latency, region distribution.
- `query_geo_api()` — optional region lookup via free IP geo APIs, cached 24h.
- `can_reach_public_internet()` — used by `update.py` to skip verification in
  offline CI.

### dedup.py — de-duplication

Library module. Mirror sources copy the same nodes with different remarks,
encodings, or ordering. `dedup_by_fingerprint()` hashes each node by
`(protocol, server, port, auth_secret)` and keeps the first occurrence, which
cuts the candidate set (and the verification work) by a large margin before any
network check happens.

### formatter.py — output formatting

Library module. The only module that writes files.

- `to_clash_yaml()` / `to_clash_yaml_by_protocol()` — Clash subscription.
- `to_v2ray_subscription()` — V2Ray / general subscription text.
- `to_proxy_list()` — plain `host:port` proxy list.
- `to_quality_report()` — `nodes/quality.json` daily snapshot.
- `write_outputs()` — atomic writes of everything above + region grouping.

### utils.py — shared helpers

Library module. Used across the pipeline.

- Logging: `setup_logging()`, `get_logger()`.
- Base64: `safe_b64decode()`, `_pad_base64()`, `decode_bytes()` (UTF-8 → GBK →
  latin-1 fallback).
- **SSRF protection**: `validate_url()` rejects non-HTTPS / unexpected hosts,
  `is_private_host()` and `allowed_hosts()` block private and reserved IPs.
- `load_sources()` — load and minimally validate `sources.json`.
- `protocol_of()` — detect a link's protocol (normalizes `hy2` → `hysteria2`).

## Configuration

### sources.json

A JSON object with a `free_node_sources` array. Each item is one public source:

```json
{
  "name": "example-source",
  "type": "github_raw",
  "url": "https://raw.githubusercontent.com/owner/repo/main/sub",
  "enabled": true,
  "decode_base64": true,
  "update_interval": "daily",
  "protocols": ["vmess", "vless", "ss", "trojan"],
  "note": "What this source is."
}
```

`type` can be `github_raw` / `web_url` / `html` / `git_repo` / `rss`.
`decode_base64` toggles whole-file Base64 decoding; `protocols` filters which
link kinds to keep; `enabled: false` leaves a source in the file without
crawling it.

### Environment variables

All behaviour can be tuned without editing code. See `.env.example`.

| Variable | Default | Meaning |
|---|---|---|
| `FREENODE_LOG_LEVEL` | `INFO` | Log verbosity. |
| `FREENODE_VERIFY_NODES` | `true` | Verify node reachability. |
| `FREENODE_VERIFY_TIMEOUT` | `5` | Per-node connect timeout (seconds). |
| `FREENODE_VERIFY_WORKERS` | `50` | Concurrent verification workers. |
| `FREENODE_MAX_NODES` | `800` | Max nodes kept in output. |
| `FREENODE_MAX_PROXIES` | `300` | Max proxies kept in output. |
| `FREENODE_CRAWL_WORKERS` | _auto_ | Concurrent fetch workers. |
| `FREENODE_ALLOWED_HOSTS` | `raw.githubusercontent.com,gitcode.com,api.gitcode.com` | Crawler host allow-list (SSRF guard). |
| `FREENODE_RELIABILITY_FLOOR` | _none_ | Drop sources below this 14-day reliability %. |
| `FREENODE_GEO_ENABLED` | `false` | Group nodes by region (needs geo APIs). |

## Output Files

Everything is written to `nodes/`:

| File | Purpose |
|---|---|
| `clash.yaml` | Clash subscription. |
| `v2ray.txt` | V2Ray / general subscription. |
| `proxies.txt` | Plain HTTP(S)/SOCKS proxy list. |
| `regions.json` | Nodes grouped by protocol / region. |
| `quality.json` | Today's quality snapshot (total, survival rate, avg latency, failure reasons). |
| `sources-report.json` | Per-source reliability score over the last 14 days. |
| `discovered-sources.json` | Candidates from `discover_sources.py` (`enabled: false`). |

## Automated Daily Update

`.github/workflows/update-nodes.yml` runs `python scripts/update.py --verify`
every day at 02:00 UTC and commits the refreshed `nodes/`. You can also trigger
it manually from the repository's **Actions** tab.

If your runner blocks outbound ports and verification fails for everything
(empty output), change `--verify` to `--no-verify` in the workflow.

## Development

```bash
make test    # run the tests/ suite
make lint    # ruff checks
make update  # same as `python scripts/update.py`
```

## Guides

- [Protocols Explained](guides/PROTOCOLS.md) — What each proxy protocol is
  and how they compare (SS / VMess / VLESS / Trojan / Hysteria / TUIC / HTTP
  / SOCKS).
- [Client Setup](guides/CLIENTS.md) — How to subscribe in Clash, v2rayN,
  Shadowrocket, Stash, sing-box, and more.
- [Source Catalog](guides/SOURCES.md) — Every source this repo collects from,
  ranked by quality and star count.

## License

Released under the [MIT License](LICENSE). Free to use, modify, and
redistribute; just keep the copyright notice.

## Other Languages

- 中文: [README.zh-CN.md](README.zh-CN.md)
- 日本語: [README.ja.md](README.ja.md)
