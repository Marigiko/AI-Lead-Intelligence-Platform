"""Verify core application components are importable."""


def test_import_fastapi_app():
    from src.api.app import app

    assert app is not None


def test_import_config():
    from src.core.config import get_settings

    settings = get_settings()
    assert settings is not None
