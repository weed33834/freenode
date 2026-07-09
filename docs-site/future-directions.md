# Future Directions

This page lists directions FreeNode *could* go in. These are **not commitments** — they are exploratory ideas for community members who want to help. Each item explains the motivation and the rough shape of the work, so you can decide whether to pick one up.

Most of the original roadmap (pluggable adapters, Telegram ingestion, HTML/RSS/git-repo sources, cross-source dedup, latency sorting, protocol-level verification for trojan/ss, schedule decoupling, PostgreSQL, decentralized distribution via IPFS/R2, security audit) has already shipped — see the [changelog](https://github.com/MS33834/freenode/blob/main/CHANGELOG.md). What remains is below.

If you start working on something here, open an Issue first so we can coordinate.

## Smarter verification

### 1. Protocol-level handshake for vmess / vless / hysteria / tuic

**Motivation.** `verify_node_protocol()` in `scripts/verifier.py` already does a real TLS handshake for trojan and a probe-byte check for ss. But vmess, vless, hysteria, hysteria2, and tuic still fall back to `tcp_only` — a live port says nothing about whether the auth or transport actually works.

**Shape of the work.** For vmess/vless, send a minimal request header and check for a response. For hysteria/tuic, do a QUIC handshake (the current TCP probe is meaningless for UDP-based protocols). This is slower per node (50-500ms vs 5-20ms for TCP) but the survival signal is far more accurate. Run it as a second-stage verify on TCP-alive nodes only, gated behind `FREENODE_VERIFY_LEVEL=protocol`.

### 2. Per-region subscription files

**Motivation.** Today the output is a single `nodes/clash.yaml` (plus per-protocol splits when `verify_level=protocol`). Clients pick the first node, which may be slow for that user's region. The data is already there — `regions.json` groups nodes by region.

**Shape of the work.** Optionally emit per-region subscription files (`nodes/clash-hk.yaml`, `nodes/clash-jp.yaml`, ...) so users can pick a region manually. Reuse `to_clash_yaml()` with a region filter; add a flag (e.g. `FREENODE_REGION_SPLITS=HK,JP,US,SG`) to opt in.

## Operational hardening

### 3. Redis-backed rate limiter for multi-worker deployments

**Motivation.** `backend/app/core/rate_limit.py` is an in-memory token bucket — fine for a single uvicorn worker, but `docker-compose.yml` runs gunicorn with 2 workers, so each worker has its own bucket and the effective limit doubles.

**Shape of the work.** Swap the `OrderedDict` LRU for a Redis-backed limiter (e.g. `redis-py` + a sliding-window or token-bucket Lua script). Gate it behind `FREENODE_RATELIMIT_BACKEND=memory|redis` so dev stays dependency-free. Document the Redis URL env var in `CONFIGURATION.md`.

### 4. Default-enable auto-disable of unreliable sources

**Motivation.** `crawler.py` already skips sources whose 30-day reliability is below `FREENODE_RELIABILITY_FLOOR`, but the default is `0` (disabled) to avoid false positives. As the project accumulates more `nodes/sources-report.json` history, we can pick a safe non-zero default (e.g. 10-20%) and let `force_enabled: true` override per source.

**Shape of the work.** Wait until at least 30 days of reliability data is stable across runs, then raise the default floor in `crawler.py` and `CONFIGURATION.md`. Surface auto-disabled sources on the status page so maintainers can re-enable or remove them.

### 5. Wire GitHub Search discovery into the pipeline

**Motivation.** `scripts/discover_sources.py` already calls the GitHub Search API, filters by stars/license/push-date, and writes candidate sources to `nodes/discovered-sources.json` (`enabled=false`). But it's a manual CLI — nothing in `update.py` or the scheduler runs it, so the candidate list goes stale.

**Shape of the work.** Add a weekly scheduler job (e.g. `FREENODE_SCHEDULE_DISCOVER = "0 5 * * 1"`) that runs discovery and opens/updates an Issue listing new candidates for human review (never auto-enable). Respect GitHub's 30 req/min authenticated rate limit and cache results for 24h.

## Testing

### 6. Fuzz tests for the parser

**Motivation.** `scripts/parser.py` decodes untrusted Base64/JSON from arbitrary public sources. `safe_b64decode` has a 256KB length cap, but the JSON parsing, vmess header decoding, and query-string extraction haven't been fuzzed. An adversarial input could still trigger an unhandled exception or memory spike.

**Shape of the work.** Add `tests/test_parser_fuzz.py` using [atheris](https://github.com/google/atheris). Fuzz `parse_vmess_link`, `parse_hysteria2_link`, and the top-level link extractor with byte-string inputs. Run as a separate `make fuzz` target (not part of `make check`) since fuzz runs are long.

## How to pick

- **Interested in protocols?** #1 (handshake expansion) is well-scoped and high-impact.
- **Operations-minded?** #3 (Redis limiter) and #4 (default reliability floor) make the project production-grade.
- **Want a self-contained task?** #2 (per-region files) or #6 (fuzz tests) have clear acceptance criteria.

Pick one, open an Issue, and we'll scope it together.
