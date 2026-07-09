from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from src.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "lead_platform",
    broker=str(settings.redis_url),
    backend=str(settings.redis_url),
    include=[
        "src.workers.discovery_tasks",
        "src.workers.enrichment_tasks",
        "src.workers.scoring_tasks",
        "src.workers.outreach_tasks",
        "src.workers.sdr_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "src.workers.discovery_tasks.*": {"queue": "scraping"},
        "src.workers.enrichment_tasks.*": {"queue": "enrichment"},
        "src.workers.scoring_tasks.*": {"queue": "ai"},
        "src.workers.outreach_tasks.*": {"queue": "outreach"},
        "src.workers.sdr_tasks.*": {"queue": "ai"},
    },
    beat_schedule={
        "check-pending-conversations": {
            "task": "src.workers.sdr_tasks.check_pending_conversations",
            "schedule": crontab(minute="*/5"),
        },
        "cleanup-expired-sessions": {
            "task": "src.workers.discovery_tasks.cleanup_stale_jobs",
            "schedule": crontab(hour="*/6"),
        },
    },
)
