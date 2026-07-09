"""APScheduler integration: runs periodic crawl/verify/cleanup jobs."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import delete

from app.config import get_settings
from app.database import db_session
from app.models import NodeCheck
from app.services.pipeline_service import run_full_pipeline, run_verify_pipeline

logger = logging.getLogger("freenode.scheduler")

_scheduler: AsyncIOScheduler | None = None


async def _full_refresh_job() -> None:
    """Daily full pipeline run (crawl + verify + publish)."""
    logger.info("scheduled full refresh starting")
    try:
        await run_full_pipeline(verify=True)
    except Exception:
        logger.exception("scheduled full refresh failed")


async def _verify_alive_job() -> None:
    """Re-verify alive nodes every 30 min (no crawl)."""
    logger.info("scheduled alive-node verification starting")
    try:
        await run_verify_pipeline(only_dead=False)
    except Exception:
        logger.exception("scheduled alive-node verification failed")


async def _verify_dead_job() -> None:
    """Re-verify dead nodes every 6 h so they get a revival chance."""
    logger.info("scheduled dead-node verification starting")
    try:
        await run_verify_pipeline(only_dead=True)
    except Exception:
        logger.exception("scheduled dead-node verification failed")


async def _cleanup_job() -> None:
    """Drop NodeCheck rows older than 90 days."""
    logger.info("scheduled cleanup starting")
    try:
        cutoff = datetime.now(UTC) - timedelta(days=90)
        async with db_session() as session:
            result = await session.execute(
                delete(NodeCheck).where(NodeCheck.checked_at < cutoff)
            )
            await session.commit()
        logger.info("cleanup done: deleted %d old NodeCheck rows", result.rowcount)
    except Exception:
        logger.exception("scheduled cleanup failed")


def init_scheduler() -> AsyncIOScheduler:
    """Initialise and start the scheduler (call once on startup)."""
    global _scheduler
    if _scheduler is not None:
        return _scheduler

    settings = get_settings()
    _scheduler = AsyncIOScheduler(timezone="UTC")

    # max_instances=1 prevents overlapping runs from racing on DB writes;
    # coalesce collapses missed triggers into a single run.
    common_kwargs = {
        "replace_existing": True,
        "max_instances": 1,
        "coalesce": True,
    }

    if settings.schedule_full_refresh:
        _scheduler.add_job(
            _full_refresh_job,
            CronTrigger.from_crontab(settings.schedule_full_refresh),
            id="full_refresh",
            **common_kwargs,
        )
    if settings.schedule_verify_alive:
        _scheduler.add_job(
            _verify_alive_job,
            CronTrigger.from_crontab(settings.schedule_verify_alive),
            id="verify_alive",
            **common_kwargs,
        )
    if settings.schedule_verify_dead:
        _scheduler.add_job(
            _verify_dead_job,
            CronTrigger.from_crontab(settings.schedule_verify_dead),
            id="verify_dead",
            **common_kwargs,
        )
    if settings.schedule_cleanup:
        _scheduler.add_job(
            _cleanup_job,
            CronTrigger.from_crontab(settings.schedule_cleanup),
            id="cleanup",
            **common_kwargs,
        )

    _scheduler.start()
    logger.info("scheduler started with %d jobs", len(_scheduler.get_jobs()))
    return _scheduler


def shutdown_scheduler() -> None:
    """Gracefully shut down, letting in-flight jobs finish."""
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=True)
        _scheduler = None
