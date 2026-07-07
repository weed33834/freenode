# Development Guide

This file is for FreeNode contributors. It covers local setup, architecture, testing, and the pre-push checklist.

## Setup

Python 3.12+ and Node.js 20+ are required.

```bash
# Python deps (pipeline + backend)
pip3 install -r requirements.txt
pip3 install -r backend/requirements.txt

# Frontend deps
cd web && npm install
```

## Project layout

```text
freenode/
├── scripts/          # pipeline: crawler / parser / verifier / formatter
├── config/           # sources.json — data source config
├── nodes/            # pipeline output (static subscription files)
├── backend/          # FastAPI service
│   ├── app/
│   │   ├── main.py          # entry, lifespan manages DB and scheduler
│   │   ├── config.py         # env-var based settings
│   │   ├── database.py       # async SQLAlchemy engine
│   │   ├── models/           # ORM models
│   │   ├── schemas/          # Pydantic request/response
│   │   ├── routers/          # API routes
│   │   ├── services/         # business logic (pipeline_service, etc.)
│   │   ├── scheduler/        # APScheduler jobs
│   │   ├── core/             # auth, rate limiting
│   │   └── pipeline/         # bridge to scripts/
│   ├── tests/                # backend integration tests
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── Caddyfile
├── web/              # Next.js frontend
│   ├── app/                  # App Router pages
│   ├── components/           # UI components
│   └── lib/api.ts            # backend API client
├── tests/            # pipeline unit tests
└── .github/workflows/  # CI: test / daily update / deploy
```

## Local dev

### Backend

```bash
cd backend
cp .env.example .env  # adjust as needed
uvicorn app.main:app --reload --port 8000

# API docs auto-generated at http://localhost:8000/docs
```

### Frontend

```bash
cd web
npm run dev  # http://localhost:3000

# next.config.mjs has rewrites that proxy /api/* to localhost:8000
```

With both running, the frontend proxies API requests automatically — no CORS config needed.

## Testing

```bash
make test          # pipeline unit tests (utils / parser / formatter / verifier / crawler / update)
make test-backend  # backend API integration tests (endpoints + DB + auth + rate limit)
make lint          # Python lint (ruff)
make check         # full pre-push gate: lint + tests + frontend tsc + lint-web
make cov           # run tests with coverage report (terminal + htmlcov/)
make secrets       # scan for leaked tokens/keys
cd web && npx tsc --noEmit  # frontend type check (standalone)
cd web && npm run lint       # frontend lint (standalone)
```

Backend tests create a temporary SQLite DB under `backend/data/` and clean up after themselves.

## Pre-push checklist

Run through this before every push. If anything is red, fix it — don't skip. Or just run `make check`, which covers the first five "must pass" items.

### Must pass

- [ ] `make check` — full gate (lint + tests + frontend tsc + lint-web)
- [ ] `make test` — pipeline tests pass
- [ ] `make test-backend` — backend integration tests pass
- [ ] `make lint` — no ruff errors
- [ ] `cd web && npx tsc --noEmit` — no type errors
- [ ] `cd web && npm run lint` — no eslint errors or warnings
- [ ] `git status` confirms no `.env`, `*.db`, `node_modules/`, `__pycache__/` staged by mistake

### Security

- [ ] `make secrets` — no leaked tokens (ghp_/oauth2:/AKIA, etc.)
- [ ] No hardcoded keys, tokens, or passwords in code
- [ ] `.env` and `*.db` are covered by `.gitignore`
- [ ] New SQL uses parameterized queries (SQLAlchemy ORM or `text()` bindings) — no string concatenation
- [ ] New routes handling external input have rate limiting or auth
- [ ] Internal errors are not leaked to users (use `HTTPException`, not bare `raise`)
- [ ] Frontend never renders `raw_link` / `auth_secret` or other sensitive fields

### Repo hygiene

- [ ] GitHub Actions CI is green (check 1–2 min after push)
- [ ] Open PRs and Issues are triaged or replied to
- [ ] Both remotes (GitHub + GitCode) have the same HEAD
- [ ] Dependabot PRs are either merged or closed — don't leave them hanging
- [ ] Commit messages follow Conventional Commits (feat / fix / docs / chore / refactor)

### Docs and code style

- [ ] Comments are plain and human — no AI filler (avoid leveraging / seamless / robust / comprehensive)
- [ ] No emoji in code or docs
- [ ] New features that change API behavior also update docs and type definitions
- [ ] Frontend and backend types stay in sync (if you change a backend schema, update `web/lib/api.ts` interfaces too)

## Pushing to remotes

The project has two remotes. Every push must sync both.

Install the pre-push hook once — it runs `make check` + secret scan on every push and blocks if anything is red:

```bash
make install-hooks   # one-time, sets git core.hooksPath to .githooks
```

To skip on a false positive: `git push --no-verify` (not recommended).

```bash
# GitHub
git push https://github.com/MS33834/freenode.git main

# GitCode (mirror)
git push https://gitcode.com/badhope/freenode.git main
```

After pushing, confirm both remotes show the same HEAD commit hash. GitHub Actions runs CI automatically — wait for it to go green before moving on.

## FAQ

**Q: Backend startup fails with `ModuleNotFoundError: No module named 'sqlalchemy'`**

A: Backend deps aren't installed. Run `pip3 install -r backend/requirements.txt`.

**Q: Frontend shows empty data**

A: Backend isn't running, or `API_BASE_URL` isn't set. In dev, the backend runs on port 8000 and the frontend rewrites proxy to it automatically.

**Q: `make test-backend` complains `httpx` is missing**

A: httpx is a test dep. Run `pip3 install httpx` (it's already in `requirements.txt`).

**Q: SQLite throws `database is locked`**

A: Backend is in debug mode and SQL echo logging is too noisy. Turn off `FREENODE_DEBUG` or reduce concurrency.
