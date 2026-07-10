"""FastAPI application entry point."""

from __future__ import annotations

import logging
import subprocess
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.core.logging_config import setup_logging
from app.database import Base, get_engine
from app.routers import health_admin, nodes, sources, stats, subscriptions
from app.scheduler.jobs import init_scheduler, shutdown_scheduler

settings = get_settings()
setup_logging(settings.debug)
logger = logging.getLogger("freenode")

# backend/ 目录，alembic 命令在这里跑才能找到 alembic.ini。
BACKEND_DIR = Path(__file__).resolve().parent.parent
# 项目根目录，读 VERSION 用。
PROJECT_ROOT = BACKEND_DIR.parent


def _read_version() -> str:
    """从项目根的 VERSION 文件读版本号，读不到就回退到 0.0.0。"""
    try:
        return (PROJECT_ROOT / "VERSION").read_text(encoding="utf-8").strip() or "0.0.0"
    except OSError:
        return "0.0.0"


APP_VERSION = _read_version()


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[no-untyped-def]
    """Application startup/shutdown lifecycle."""
    settings = get_settings()

    # Run migrations on startup. gunicorn --preload ensures this only runs
    # in the master process; multiple workers racing on alembic_version
    # would deadlock. Failure is fatal — don't mask it with create_all.
    try:
        subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd=str(BACKEND_DIR),
            check=True,
            capture_output=True,
            text=True,
        )
        logger.info("database migrations applied")
    except FileNotFoundError:
        # No alembic installed (local dev): fall back to create_all.
        logger.warning("alembic not found, falling back to create_all (dev only)")
        async with get_engine().begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception:
        logger.exception("alembic upgrade failed")
        raise

    # Start the scheduler.
    if not settings.debug:
        init_scheduler()
        logger.info("scheduler initialised")
    else:
        logger.info("debug mode — scheduler disabled")

    yield

    shutdown_scheduler()
    await get_engine().dispose()
    logger.info("shutdown complete")


def create_app() -> FastAPI:
    """Application factory."""
    settings = get_settings()

    # Hide docs/openapi in production to avoid leaking the API surface.
    show_docs = settings.debug
    app = FastAPI(
        title=settings.app_name,
        description="FreeNode API — free proxy and public node aggregator.",
        version=APP_VERSION,
        lifespan=lifespan,
        docs_url="/docs" if show_docs else None,
        redoc_url="/redoc" if show_docs else None,
        openapi_url="/openapi.json" if show_docs else None,
    )

    # CORS: explicit headers instead of "*" + credentials (unsafe combo).
    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    if origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["GET", "POST", "DELETE", "PATCH"],
            allow_headers=["Content-Type", "Authorization", "X-API-Key"],
        )

    # Register routers under /api
    api_prefix = settings.api_prefix
    app.include_router(nodes.router, prefix=api_prefix)
    app.include_router(stats.router, prefix=api_prefix)
    app.include_router(sources.router, prefix=api_prefix)
    app.include_router(subscriptions.router, prefix=api_prefix)
    app.include_router(health_admin.router, prefix=api_prefix)

    @app.get("/", tags=["root"])
    async def root() -> dict:
        return {
            "name": settings.app_name,
            "version": APP_VERSION,
            "docs": "/docs",
            "health": f"{api_prefix}/health",
        }

    return app


app = create_app()
