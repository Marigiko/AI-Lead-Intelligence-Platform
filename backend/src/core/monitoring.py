"""
Monitoring and metrics — Prometheus-compatible metrics.
"""

from __future__ import annotations

from prometheus_client import Counter, Gauge, Histogram, Info

# App info
app_info = Info("lead_platform", "AI Lead Intelligence Platform")
app_info.info({"version": "0.1.0"})

# HTTP metrics
http_requests_total = Counter(
    "lead_platform_http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)

http_request_duration_seconds = Histogram(
    "lead_platform_http_request_duration_seconds",
    "HTTP request duration",
    ["method", "endpoint"],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)

# Business metrics
companies_discovered_total = Counter(
    "lead_platform_companies_discovered_total",
    "Total companies discovered",
    ["tenant_id", "source"],
)

campaigns_sent_total = Counter(
    "lead_platform_campaigns_sent_total",
    "Total campaign messages sent",
    ["tenant_id", "channel"],
)

email_opened_total = Counter(
    "lead_platform_email_opened_total",
    "Total email opens",
    ["campaign_id"],
)

email_replied_total = Counter(
    "lead_platform_email_replied_total",
    "Total email replies",
    ["campaign_id"],
)

deals_created_total = Counter(
    "lead_platform_deals_created_total",
    "Total deals created",
    ["tenant_id"],
)

deals_won_total = Counter(
    "lead_platform_deals_won_total",
    "Total deals won",
    ["tenant_id"],
)

ai_tokens_used_total = Counter(
    "lead_platform_ai_tokens_used_total",
    "Total AI tokens consumed",
    ["model", "tenant_id"],
)

# Scraper metrics
scraper_jobs_total = Counter(
    "lead_platform_scraper_jobs_total",
    "Total scraper jobs",
    ["source", "status"],
)

scraper_duration_seconds = Histogram(
    "lead_platform_scraper_duration_seconds",
    "Scraper job duration",
    ["source"],
    buckets=[1, 5, 10, 30, 60, 120, 300],
)

# System metrics
active_connections = Gauge(
    "lead_platform_active_connections",
    "Active WebSocket connections",
)
