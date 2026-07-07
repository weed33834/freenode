# Future Directions

This page lists directions FreeNode *could* go in. These are **not commitments** — they are exploratory ideas for community members who want to help. Each item explains the motivation and the rough shape of the work, so you can decide whether to pick one up.

If you start working on something here, open an Issue first so we can coordinate.

## Smarter source collection

Today the crawler is intentionally simple: it fetches a static file (Base64 or plain text) from each entry in `config/sources.json`, decodes it, and extracts links with a regex. This works — the daily pipeline produces ~800 verified nodes — but the coverage and intelligence can clearly improve. Below are the directions that look most worthwhile.

### 1. GitHub Search API discovery

**Motivation.** Almost all current sources are `raw.githubusercontent.com` URLs that someone hand-added to `sources.json`. There are hundreds of public "free-node" repos on GitHub, many of which we have not discovered. New ones appear weekly; old ones go stale.

**Shape of the work.** Add a discovery job that calls `GET /search/repositories?q=freenode+OR+v2ray+subscription+pushed:>2026-06-01` with a token, filters by stars / last-push / license, and proposes new `github_raw` candidates to a review queue (not auto-enabled). Respect GitHub's rate limits (30 searched requests/min for authenticated, 10/min anonymous). Cache results for 24h.

**Why not auto-add.** Search results include repos with paid/private nodes, honeypots, or stolen configs. Human review stays required — discovery just widens the funnel.

### 2. HTML page scraping

**Motivation.** Some community sources publish nodes inside blog posts, forum threads, or paste pages, not as raw files. Today we skip them entirely.

**Shape of the work.** Add a `web_html` source type. The fetcher downloads the HTML, then runs a configurable extractor: CSS selector or XPath pointing at the `<pre>` / `<code>` block that holds the Base64 blob or link list. Store the selector in `sources.json` per source. Use `selectolax` or `lxml` — both are fast and have no browser overhead.

**Risk.** HTML sources break often when the site redesigns. The reliability score already in place will surface breakages; the auto-Issue workflow will flag them.

### 3. Telegram channel ingestion

**Motivation.** A large fraction of public free-node sharing happens in Telegram channels, not GitHub. Ignoring TG leaves a lot of coverage on the table.

**Shape of the work.** Add a `telegram_channel` source type. Use [Telethon](https://docs.telethon.dev/) (client API, not bot API — bots can't read channel history) with a user session. Fetch the last N messages, extract links from message text or attached files. Rate-limit to 1 message/sec to avoid flood bans. Store the channel ID + access hash in `sources.json`.

**Caveats.** This needs a real Telegram account session, which is a operational burden. Session files are sensitive — store encrypted, never commit. Some channels ban scraping in their bio; respect that.

### 4. Git repo cloning for multi-file sources

**Motivation.** A few sources publish nodes across multiple files inside a repo (e.g. `clash.yaml`, `v2ray.txt`, `ss.txt` in subfolders). Today we only fetch one raw URL per source, missing the rest.

**Shape of the work.** Add a `git_repo` source type. Use `git clone --depth 1` to a temp dir, then glob for `*.yaml`, `*.txt`, `*.base64` and feed each through the existing parser. Clean up the clone after each run. Depth-1 keeps it fast (~1-3s per repo).

### 5. RSS / Atom feeds

**Motivation.** Some node-sharing sites publish updates via RSS. Polling RSS is cheaper than polling the full page and gives us a natural "what changed" signal.

**Shape of the work.** Add a `rss` source type. Parse with `feedparser`, extract the node links from `<description>` or `<content:encoded>`. Use the feed's `last_updated` to skip unchanged entries.

### 6. Cross-source deduplication

**Motivation.** Right now the same node (same server + port + auth) often appears in 5+ sources, because many community repos mirror each other. We dedup by exact link string, but the *same* node can have different remarks / encoding / ordering and slip through. This inflates the candidate pool and wastes verification budget.

**Shape of the work.** The DB already has `Node.compute_fingerprint(protocol, server, port, auth_secret)` which is content-based. Extend the crawler stage to compute fingerprints *before* verification, dedup by fingerprint, and only verify the unique set. This should cut verify time noticeably.

### 7. Protocol coverage expansion

**Motivation.** We currently parse `vmess`, `vless`, `ss`, `trojan`. Newer protocols gaining traction: `hysteria`, `hysteria2`, `tuic`, `naive`, `mieru`, `ssr`. Clients like sing-box and mihomo support them; we ignore them today.

**Shape of the work.** Add parsers in `scripts/parser.py` for each protocol's URI scheme. Most have a `scheme://base64json` or `scheme://querystring` format similar to vmess. Extend `node_to_clash_config` and the Clash YAML emitter to output the new types. Add tests with sample links.

### 8. Source adapter plugin API

**Motivation.** Each new source type above is currently a hardcoded branch in `crawler.py`. As types grow, this becomes unmaintainable.

**Shape of the work.** Define a `SourceAdapter` protocol: `fetch(source) -> str` and `parse(text) -> list[str]`. Register adapters by `type` field in `sources.json`. External packages can register additional adapters via entry points (`[project.entry-points."freenode.adapters"]`), so people can extend without forking.

### 9. Auto-disable unreliable sources

**Motivation.** `nodes/sources-report.json` already tracks a 14-day reliability score. Today a source can sit at 0% for weeks and still get fetched every run, wasting time and bandwidth.

**Shape of the work.** In `crawl()`, skip sources whose 30-day reliability is below a threshold (e.g. 20%). Surface disabled sources on the status page. A maintainer can still force-enable by setting `force_enabled: true` in `sources.json`.

## Smarter verification

### 10. Protocol-level handshake

**Motivation.** Today verification is a TCP `connect()` to `server:port`. A port being open does not mean the proxy actually works — many free nodes have live ports but broken auth, expired certs, or wrong transport.

**Shape of the work.** After TCP connect, do a protocol-specific handshake:
- `vmess` / `vless`: send a minimal request header, check for a response.
- `ss`: do a SOCKS5-style handshake through the cipher.
- `trojan`: TLS handshake + Trojan protocol header.
- `hysteria` / `tuic`: QUIC handshake.

This is slower per node (50-500ms vs 5-20ms for TCP) but the survival signal is far more accurate. Run it as a second-stage verify on TCP-alive nodes only.

### 11. Latency-aware sorting and regional routing

**Motivation.** Today the output files are ordered by source order. Clients pick the first node, which may be slow for that user's region.

**Shape of the work.** Sort alive nodes by latency in the output files. Optionally emit per-region subscription files (`nodes/clash-hk.yaml`, `nodes/clust-jp.yaml`, ...) so users can pick a region manually. The `regions.json` file already has the data.

## Operational hardening

### 12. Decouple crawl and verify schedules

**Motivation.** The scheduler currently runs the *full* pipeline (crawl + parse + verify + publish) every 30 minutes (`FREENODE_SCHEDULE_VERIFY_ALIVE`). Re-crawling 78 sources every 30 minutes is wasteful — most sources update daily, not hourly. The verify-only step should be cheap.

**Shape of the work.** Split `run_full_pipeline` into `run_crawl_pipeline` (full refresh, daily) and `run_verify_pipeline` (re-verify existing DB nodes, every 30min). The verify-only path skips crawl entirely, reads `Node` rows from the DB, re-checks them, and updates `is_alive` / `last_latency_ms`. This cuts the 30-min job from ~5min to ~30s.

### 13. PostgreSQL support and connection pooling

**Motivation.** SQLite is fine for a single-process dev setup but struggles under concurrent verify workers (50 threads writing `NodeCheck` rows). Production deployments on cloud servers should use PostgreSQL.

**Shape of the work.** The `FREENODE_DATABASE_URL` already accepts any SQLAlchemy URL, so `postgresql+asyncpg://...` works out of the box. Add a `postgres` profile to `docker-compose.yml` (managed Postgres or `postgres:16-alpine` sidecar), document the switch in `deployment.md`, and load-test with ~10k nodes to confirm write throughput.

### 14. Decentralized distribution

**Motivation.** Today the subscription files live only on GitHub Raw and GitCode. If both rate-limit or block the project, users have no fallback.

**Shape of the work.** Publish the daily `nodes/` directory to IPFS via a pinning service (Pinata, nft.storage) and/or a static mirror (Cloudflare R2 + Workers). Add a `nodes/mirrors.json` listing all distribution endpoints so clients can fall back automatically. Keep GitHub/GitCode as primary; IPFS/mirror as secondary.

### 15. Security audit

**Motivation.** The crawler fetches arbitrary URLs and parses untrusted input. `validate_url` blocks SSRF to private IPs, but the parser, verifier, and formatter have not had an external audit.

**Shape of the work.** A focused review of: `validate_url` and `is_private_host` for bypass vectors (DNS rebinding, IPv6-mapped IPv4, IDN homograph), the parser's Base64/JSON handling for memory blowup, and the verifier's socket handling for resource leaks. Add fuzz tests for the parser with `atheris`.

## How to pick

- **New to the codebase?** Start with #6 (cross-source dedup) or #11 (latency sorting) — both are self-contained and have clear acceptance criteria.
- **Want to broaden coverage?** #1 (GitHub Search), #2 (HTML scraping), or #4 (git repo clone) each unlock new source types.
- **Interested in protocols?** #7 (protocol expansion) is well-scoped and high-impact.
- **Operations-minded?** #12 (schedule split) and #13 (Postgres) make the project production-grade.

Pick one, open an Issue, and we'll scope it together.
