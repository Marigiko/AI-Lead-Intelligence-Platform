"""
Plugin registry — auto-discovers and manages scraper plugins.
"""
from __future__ import annotations

import importlib
import pkgutil
from typing import Any

import structlog

from src.infrastructure.scraping.plugins.base import BaseScraper

logger = structlog.get_logger()


class PluginRegistry:
    """Central registry for all scraper plugins."""

    def __init__(self) -> None:
        self._plugins: dict[str, BaseScraper] = {}
        self._discovered = False

    def register(self, plugin: BaseScraper) -> None:
        if not plugin.source_name:
            raise ValueError(f"Plugin {plugin.__class__.__name__} must define source_name")
        self._plugins[plugin.source_name] = plugin
        logger.info("plugin_registered", source=plugin.source_name, label=plugin.source_label)

    def get(self, source_name: str) -> BaseScraper | None:
        return self._plugins.get(source_name)

    def list_plugins(self) -> list[dict[str, Any]]:
        return [p.to_dict() for p in self._plugins.values()]

    def list_source_names(self) -> list[str]:
        return list(self._plugins.keys())

    def discover(self) -> None:
        """Auto-discover all plugins in the plugins package."""
        if self._discovered:
            return

        import src.infrastructure.scraping.plugins as plugins_pkg

        package_path = plugins_pkg.__path__
        for importer, modname, ispkg in pkgutil.iter_modules(package_path):
            if modname.startswith("_") or modname in ("base", "registry"):
                continue
            try:
                module = importlib.import_module(f"src.infrastructure.scraping.plugins.{modname}")
                # Look for BaseScraper subclasses
                for attr_name in dir(module):
                    attr = getattr(module, attr_name)
                    if (
                        isinstance(attr, type)
                        and issubclass(attr, BaseScraper)
                        and attr is not BaseScraper
                        and attr.source_name
                    ):
                        instance = attr()
                        self.register(instance)
            except Exception as e:
                logger.error("plugin_discovery_failed", module=modname, error=str(e))

        self._discovered = True
        logger.info("plugins_discovered", count=len(self._plugins))


# Singleton
_registry: PluginRegistry | None = None


def get_plugin_registry() -> PluginRegistry:
    global _registry
    if _registry is None:
        _registry = PluginRegistry()
        _registry.discover()
    return _registry
