# Deployment Guide

This guide covers self-hosting the full FreeNode stack (backend API + Next.js
frontend + Caddy reverse proxy) on a single server with Docker Compose.

For the Chinese version, see [`docs-site/deployment.md`](docs-site/deployment.md).

## Architecture

```
Internet ─▶ Caddy :443 ─┬─ /api/*    ─▶ backend:8000  (FastAPI + gunicorn)
                        ├─ /nodes/*  ─▶ /srv/nodes     (static subscription files)
                        └─ /*        ─▶ web:3000       (Next.js standalone)

Volumes:
  backend_data  → /app/backend/data   (SQLite DB)
  nodes_output  → /app/nodes          (subscription artifacts)
                  /srv/nodes          (Caddy read-only mount)
  caddy_data    → Caddy certs & state
  postgres_data → /var/lib/postgresql/data  (optional, when using PostgreSQL)
```

Four services defined in [`backend/docker-compose.yml`](backend/docker-compose.yml):

| Service   | Image                  | Role                                                       |
| --------- | ---------------------- | ---------------------------------------------------------- |
| `backend` | Built from `backend/`  | FastAPI app + APScheduler, gunicorn with 2 uvicorn workers |
| `web`     | Built from `web/`      | Next.js standalone build, non-root user                     |
| `caddy`   | `caddy:2-alpine`       | Auto HTTPS, security headers, static subscription delivery  |
| `postgres`| `postgres:16-alpine`   | Optional — enable when node count > 5k or workers > 50      |

## Prerequisites

- A Linux server with **1 vCPU / 2 GB RAM** minimum (Ubuntu 22.04 / Debian 12 recommended).
- Docker Engine + Compose plugin:
  ```bash
  curl -fsSL https://get.docker.com | sh
  ```
- Ports **80** and **443** open on both the cloud security group and the host firewall.
- A domain name with an **A record** pointing to the server's public IP.

## Quick Start (5 steps)

### 1. Clone the repository

```bash
git clone https://github.com/MS33834/freenode.git
cd freenode/backend
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Generate two strong secrets (mandatory for production):

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"  # → ADMIN_API_KEY
python3 -c "import secrets; print(secrets.token_hex(32))"      # → SECRET_KEY_HEX
```

Edit `.env` and fill in:

```bash
FREENODE_ADMIN_API_KEY=<paste token_urlsafe output>
FREENODE_SECRET_KEY_HEX=<paste token_hex output>
```

Leave `FREENODE_DEBUG=false` for production. See [`CONFIGURATION.md`](CONFIGURATION.md)
for every variable.

### 3. Set your domain in Caddyfile

Edit [`backend/Caddyfile`](backend/Caddyfile) and replace `freenode.example.com`
with your real domain:

```caddyfile
your-domain.com {
    # ... rest unchanged
}
```

Caddy automatically obtains and renews Let's Encrypt certificates — no manual
cert management needed. The prerequisite is that ports 80/443 are reachable
from the public internet (Caddy uses port 80 for the HTTP-01 challenge).

### 4. Build and start

```bash
docker compose up -d --build
```

The first build takes 5–10 minutes (Next.js build is the longest step). On
startup the backend runs `alembic upgrade head` to create all tables, then
the scheduler begins fetching nodes per the cron schedule in `.env`.

### 5. Verify

```bash
docker compose ps                       # all containers should be Up
curl http://localhost:8000/api/health   # → {"status":"ok","total_nodes":N,...}
curl https://your-domain.com/           # → frontend HTML
```

Check logs:

```bash
docker compose logs -f backend   # API + scheduler
docker compose logs -f caddy     # reverse proxy + access log
docker compose logs -f web       # Next.js
```

## Switching to PostgreSQL

SQLite is the default and works fine up to ~5k nodes. Beyond that, or if you
run more than 50 verification workers, switch to PostgreSQL — the compose file
already ships a `postgres:16-alpine` service with health checks and a
persistent volume.

1. Edit `backend/.env`, comment out the SQLite line and uncomment the
   PostgreSQL line:
   ```bash
   # FREENODE_DATABASE_URL=sqlite:///data/freenode.db
   FREENODE_DATABASE_URL=postgresql+asyncpg://freenode:change_me@postgres:5432/freenode
   ```
2. Change `POSTGRES_PASSWORD` to a strong password that matches the connection
   string above.
3. `docker compose up -d --build`. The backend waits for postgres to pass its
   health check, then alembic builds the schema via the synchronous `psycopg2`
   driver (the async `asyncpg` is only used at runtime).
4. To migrate existing SQLite data:
   ```bash
   docker compose exec backend sqlite3 /app/backend/data/freenode.db .dump > backup.sql
   # then pipe into psql against the postgres container
   ```

## Resource Sizing

| Server spec         | Recommended settings                                    |
| ------------------- | ------------------------------------------------------- |
| 1 vCPU / 1 GB RAM   | `FREENODE_VERIFY_WORKERS=20`, `FREENODE_MAX_NODES=300`  |
| 1 vCPU / 2 GB RAM   | defaults (50 workers, 800 nodes)                        |
| 2+ vCPU / 4+ GB RAM | defaults; consider PostgreSQL for larger node pools     |

## Backup

**SQLite:**
```bash
docker compose exec backend sqlite3 /app/backend/data/freenode.db .dump > backup.sql
```

**PostgreSQL:**
```bash
docker compose exec postgres pg_dump -U freenode freenode > backup.sql
```

Schedule this via cron on the host. The `backend_data` (or `postgres_data`)
volume is the only stateful piece — everything else is reproducible from code.

## Updating

```bash
git pull
docker compose up -d --build
```

Alembic runs on every startup, so schema migrations apply automatically. The
scheduler picks up cron changes from `.env` on restart.

## Troubleshooting

### Caddy fails to obtain a certificate
- Confirm the domain's A record points to the server's **public** IP (not
  private/internal).
- Confirm ports 80 and 443 are open on both the cloud security group and the
  host firewall — Caddy needs port 80 for the HTTP-01 challenge.
- Check logs: `docker compose logs caddy | grep acme`.
- Let's Encrypt limits 5 certificate requests per domain per hour — don't
  hammer it while debugging.

### Scheduler not running
- `FREENODE_DEBUG=true` disables the scheduler. It must be `false` in production.
- Check the startup log: `docker compose logs backend | grep scheduler` — it
  should print `scheduler started with N jobs`.
- Cron times are UTC. Convert to your local timezone when reading the schedule.

### Frontend shows empty data
- Backend not running or `API_BASE_URL` misconfigured. In dev, the Next.js
  rewrites proxy `/api/*` to `http://localhost:8000`; in production, Caddy
  handles this — the `web` container talks to `http://backend:8000` internally.
- Verify `curl http://localhost:8000/api/health` returns `{"status":"ok"}`.

### Nodes are all dead / very few
- Inspect `nodes/quality.json` for `survival_rate` and `failure_reasons`.
- If everything is `timeout`, the server's outbound network or DNS may be
  blocked. Test with `curl -v https://raw.githubusercontent.com/`.
- A source that fails 3+ days in a row triggers the `source-check` workflow,
  which opens a GitHub Issue — check the Issues tab for alerts.

### Port 80/443 already in use
Stop the conflicting service (e.g. `systemctl stop nginx`) or change the port
mapping in `docker-compose.yml`. Caddy needs both 80 (for ACME challenges) and
443 (for HTTPS traffic).

## Multi-Mirror Distribution

`scripts/publish_mirrors.py` publishes subscription files to multiple mirrors
(IPFS via Pinata, Cloudflare R2, local directory) and writes a `mirrors.json`
manifest so clients can fall back when one mirror is down. See
[`docs-site/deployment.md`](docs-site/deployment.md#去中心化分发多镜像订阅)
for configuration details.
