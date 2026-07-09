"""
Proxy rotation and management.
"""
from __future__ import annotations

import random
from dataclasses import dataclass, field

import structlog

logger = structlog.get_logger()


@dataclass
class ProxyConfig:
    host: str
    port: int
    username: str = ""
    password: str = ""
    protocol: str = "http"
    country: str = ""
    is_residential: bool = False

    @property
    def url(self) -> str:
        auth = f"{self.username}:{self.password}@" if self.username else ""
        return f"{self.protocol}://{auth}{self.host}:{self.port}"


class ProxyManager:
    """Rotates proxies and manages proxy health."""

    def __init__(self) -> None:
        self._proxies: list[ProxyConfig] = []
        self._failed: dict[str, int] = {}  # proxy_url -> fail_count
        self._current_index = 0

    def add_proxy(self, proxy: ProxyConfig) -> None:
        self._proxies.append(proxy)
        logger.info("proxy_added", host=proxy.host, port=proxy.port)

    def add_proxies_from_url(self, proxy_url: str) -> None:
        """Parse proxy URL (http://user:pass@host:port) and add to pool."""
        from urllib.parse import urlparse
        parsed = urlparse(proxy_url)
        self._proxies.append(
            ProxyConfig(
                host=parsed.hostname or "",
                port=parsed.port or 8080,
                username=parsed.username or "",
                password=parsed.password or "",
                protocol=parsed.scheme or "http",
            )
        )

    def get_proxy(self) -> ProxyConfig | None:
        """Get next available proxy using round-robin with health awareness."""
        if not self._proxies:
            return None

        # Filter out failed proxies (allow retry after 5 failures = cooldown)
        available = [
            p for p in self._proxies
            if self._failed.get(p.url, 0) < 5
        ]
        if not available:
            # Reset failures and try again
            self._failed.clear()
            available = self._proxies

        proxy = available[self._current_index % len(available)]
        self._current_index += 1
        return proxy

    def report_success(self, proxy: ProxyConfig) -> None:
        self._failed.pop(proxy.url, None)

    def report_failure(self, proxy: ProxyConfig) -> None:
        self._failed[proxy.url] = self._failed.get(proxy.url, 0) + 1
        logger.warning(
            "proxy_failure",
            host=proxy.host,
            fail_count=self._failed[proxy.url],
        )

    @property
    def count(self) -> int:
        return len(self._proxies)


# Singleton
_manager: ProxyManager | None = None


def get_proxy_manager() -> ProxyManager:
    global _manager
    if _manager is None:
        _manager = ProxyManager()
        settings_proxy = __import__("src.core.config", fromlist=["get_settings"]).get_settings().proxy_url
        if settings_proxy:
            _manager.add_proxies_from_url(settings_proxy)
    return _manager
