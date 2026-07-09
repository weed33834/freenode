# Configuration Reference

All backend configuration is via environment variables (read by
`backend/app/config.py` via pydantic-settings). Copy
[`backend/.env.example`](backend/.env.example) to `.env` and edit — the Docker
Compose file auto-loads it.

For the Chinese version, see [`docs-site/data-sources.md`](docs-site/data-sources.md)
and the in-code comments in [`backend/app/config.py`](backend/app/config.py).

## Application

| Variable                  | Default                     | Description                                                            |
| ------------------------- | --------------------------- | --------------------------------------------------------------------- |
| `FREENODE_DEBUG`          | `false`                     | `true` disables the scheduler, exposes `/docs` `/openapi.json`, and returns detailed error messages. Never enable in production. |
| `FREENODE_APP_NAME`       | `FreeNode API`              | Display name in the OpenAPI title.                                     |
| `FREENODE_API_PREFIX`     | `/api`                      | Route prefix for all endpoints.                                        |
| `FREENODE_CORS_ORIGINS`   | _(empty)_                   | Comma-separated allowed origins. Leave empty when Caddy serves same-origin; set to `https://your-domain.com` for cross-origin setups. |

## Database

| Variable                  | Default                                   | Description                                                            |
| ------------------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| `FREENODE_DATABASE_URL`   | `sqlite:///data/freenode.db`              | SQLAlchemy async URL. SQLite (default) or PostgreSQL (`postgresql+asyncpg://user:pass@host:5432/db`). |
| `POSTGRES_USER`           | `freenode`                                | PostgreSQL user (only used when running the `postgres` compose service). |
| `POSTGRES_PASSWORD`       | `change_me`                               | PostgreSQL password — **must** be changed from the default.            |
| `POSTGRES_DB`             | `freenode`                                | PostgreSQL database name.                                              |

The engine is built lazily via `get_engine()` and cached for the process
lifetime. Tests call `reset_engine()` to rebind to a temp DB — see
[`backend/tests/conftest.py`](backend/tests/conftest.py).

## Authentication & Encryption

| Variable                  | Default  | Required | Description                                                            |
| ------------------------- | -------- | -------- | --------------------------------------------------------------------- |
| `FREENODE_ADMIN_API_KEY`  | _(empty)_| **yes**  | API key for `/api/admin/*` endpoints. Empty = admin endpoints disabled (return 503). Client sends via `X-API-Key` header. Generate: `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`. |
| `FREENODE_SECRET_KEY_HEX` | _(empty)_| **yes**  | 32-byte hex (64 chars) AES-GCM key for encrypting `node.auth_secret` at rest. Empty = no encryption (dev only). Generate: `python3 -c "import secrets; print(secrets.token_hex(32))"`. |

Comparison uses `secrets.compare_digest` (constant-time). The AESGCM instance
is built behind a `threading.Lock` for thread safety — see
[`backend/app/core/crypto.py`](backend/app/core/crypto.py).

## Pipeline Tuning

| Variable                  | Default | Description                                                            |
| ------------------------- | ------- | --------------------------------------------------------------------- |
| `FREENODE_MAX_NODES`      | `800`   | Max nodes kept in subscription outputs. Extras are dropped after sorting by latency. |
| `FREENODE_MAX_PROXIES`    | `300`   | Max proxies kept in `proxies.txt`.                                     |
| `FREENODE_VERIFY_NODES`   | `true`  | Whether to run TCP connectivity checks. `false` = crawl-only, no liveness data. |
| `FREENODE_VERIFY_TIMEOUT` | `5`     | Per-node verify timeout in seconds.                                    |
| `FREENODE_VERIFY_WORKERS` | `50`    | Concurrent verify workers. Lower to 20 on 1 GB RAM servers.            |
| `FREENODE_GEO_ENABLED`    | `false` | Enable GeoIP lookup (requires `geoip2` + a GeoLite2 database).         |
| `FREENODE_CRAWL_WORKERS`  | `16`    | Concurrent source fetch workers.                                       |

## Scheduler (cron, UTC)

Each variable accepts a standard 5-field cron expression. Empty = that job is
disabled.

| Variable                          | Default       | Description                                                            |
| --------------------------------- | ------------- | --------------------------------------------------------------------- |
| `FREENODE_SCHEDULE_FULL_REFRESH`  | `0 3 * * *`   | Daily full pipeline: crawl + parse + verify + upsert + publish (03:00 UTC). |
| `FREENODE_SCHEDULE_VERIFY_ALIVE`  | `*/30 * * * *`| Re-verify alive nodes every 30 min (no crawl).                        |
| `FREENODE_SCHEDULE_VERIFY_DEAD`   | `0 */6 * * *` | Re-verify dead nodes every 6 h, giving them a revival chance.          |
| `FREENODE_SCHEDULE_CLEANUP`       | `0 4 * * *`   | Drop `NodeCheck` rows older than 90 days (04:00 UTC).                  |

All jobs run with `max_instances=1, coalesce=True` — overlapping runs are
blocked, and missed triggers collapse into a single run. See
[`backend/app/scheduler/jobs.py`](backend/app/scheduler/jobs.py).

## Paths (container)

| Variable                          | Default                       | Description                                  |
| --------------------------------- | ----------------------------- | -------------------------------------------- |
| `FREENODE_SOURCES_CONFIG_PATH`    | `/app/config/sources.json`    | Path to the sources config.                  |
| `FREENODE_NODES_OUTPUT_DIR`        | `/app/nodes`                  | Directory for subscription output files.     |

Override only if you're running outside the standard Docker layout.

## Sources Configuration

Data sources are declared in [`config/sources.json`](config/sources.json).
Each entry:

```json
{
  "name": "example-source",
  "url": "https://example.com/nodes.txt",
  "category": "free_node_sources",
  "type": "web_url",
  "enabled": true,
  "decode_base64": false,
  "update_interval": "hourly",
  "max_size": 1048576
}
```

| Field            | Type      | Description                                                            |
| ---------------- | --------- | --------------------------------------------------------------------- |
| `name`           | string    | Display name (non-empty, unique).                                     |
| `url`            | string    | Source URL. Must be `http(s)://`. SSRF guard blocks private IP ranges. |
| `category`       | string    | `free_node_sources` or `free_proxy_apis`.                             |
| `type`           | string    | `web_url` \| `github_raw` \| `git_repo` \| `html` \| `rss`.           |
| `enabled`        | bool      | Set `false` to skip without deleting.                                 |
| `decode_base64`  | bool      | Base64-decode the response before parsing.                            |
| `update_interval`| string    | `5min` \| `hourly` \| `12h` \| `daily` \| `inactive` — for the health dashboard. |
| `max_size`       | int       | Max bytes to download (default 1 MiB). Prevents huge files stalling the pipeline. |
| `proxy_scheme`   | string    | For `free_proxy_apis` only: `http` \| `https` \| `socks4` \| `socks5`. |

See [`docs-site/data-source-guide.md`](docs-site/data-source-guide.md) for the
full contribution criteria and [`docs-site/data-sources.md`](docs-site/data-sources.md)
for the current list.

## Security Headers (Caddy)

Caddy adds the following headers on every response (see
[`backend/Caddyfile`](backend/Caddyfile)):

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

The Next.js frontend also sets these in [`web/next.config.mjs`](web/next.config.mjs)
so they apply even when serving via the standalone server directly.

## Rate Limiting

In-memory token bucket, single-process (see
[`backend/app/core/rate_limit.py`](backend/app/core/rate_limit.py)):

- Public endpoints: **60 req/min** per IP
- Subscription endpoints: **10 req/min** per IP
- LRU-bounded to 4096 tracked IPs (oldest evicted under pressure)
- IP resolution: `X-Real-IP` → leftmost `X-Forwarded-For` → `client.host`

For multi-worker deployments, swap in a Redis-backed limiter.
