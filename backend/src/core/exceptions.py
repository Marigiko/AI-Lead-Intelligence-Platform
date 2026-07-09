from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Base application error."""

    def __init__(
        self,
        message: str = "An error occurred",
        status_code: int = 500,
        detail: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.detail = detail or {}


class NotFoundError(AppError):
    def __init__(self, resource: str = "Resource", resource_id: str = "") -> None:
        msg = f"{resource} not found" + (f": {resource_id}" if resource_id else "")
        super().__init__(message=msg, status_code=404)


class ConflictError(AppError):
    def __init__(self, message: str = "Resource already exists") -> None:
        super().__init__(message=message, status_code=409)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Authentication required") -> None:
        super().__init__(message=message, status_code=401)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Insufficient permissions") -> None:
        super().__init__(message=message, status_code=403)


class ValidationError(AppError):
    def __init__(self, message: str = "Validation failed", detail: dict[str, Any] | None = None) -> None:
        super().__init__(message=message, status_code=422, detail=detail)


class RateLimitError(AppError):
    def __init__(self, message: str = "Rate limit exceeded") -> None:
        super().__init__(message=message, status_code=429)
