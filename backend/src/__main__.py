from __future__ import annotations

import uvicorn

from src.core.config import get_settings


def main():
    settings = get_settings()
    uvicorn.run(
        "src.api.app:app",
        host="0.0.0.0",  # noqa: S104
        port=8000,
        reload=settings.debug,
        log_level="info",
    )


if __name__ == "__main__":
    main()
