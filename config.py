import os
from datetime import timedelta


def _env_bool(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    APP_NAME = "INCAS"
    LOCAL_TIMEZONE = os.getenv("LOCAL_TIMEZONE", "Europe/Berlin")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///incas.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
    _IS_EPHEMERAL_TEST_DB = SQLALCHEMY_DATABASE_URI == "sqlite://"
    AUTO_CREATE_SCHEMA = _env_bool(
        "AUTO_CREATE_SCHEMA",
        APP_ENV in {"test", "demo"} or _IS_EPHEMERAL_TEST_DB,
    )
    SEED_DEMO_DATA = _env_bool(
        "SEED_DEMO_DATA",
        APP_ENV == "demo" or _IS_EPHEMERAL_TEST_DB,
    )
    REACT_PRIMARY_FRONTEND = _env_bool("REACT_PRIMARY_FRONTEND", True)
    TRUST_PROXY_HEADERS = _env_bool("TRUST_PROXY_HEADERS", False)
    TRUSTED_PROXY_COUNT = int(os.getenv("TRUSTED_PROXY_COUNT", "1"))
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = _env_bool("SESSION_COOKIE_SECURE", APP_ENV == "production")
    PERMANENT_SESSION_LIFETIME = timedelta(
        hours=max(1, int(os.getenv("ADMIN_SESSION_HOURS", "8")))
    )
    ACCESS_HASHES = {
        "access_keys": os.getenv(
            "ACCESS_KEYS_ROOT_HASH",
            "9e27c273f5901114167b759edaeb402f290980fe723d1b05f8afc82f0c874d8e",
        ),
    }
    INSTAGRAM_APP_ID = os.getenv("INSTAGRAM_APP_ID", "")
    INSTAGRAM_APP_SECRET = os.getenv("INSTAGRAM_APP_SECRET", "")
    INSTAGRAM_REDIRECT_URI = os.getenv("INSTAGRAM_REDIRECT_URI", "")
    INSTAGRAM_SCOPES = os.getenv(
        "INSTAGRAM_SCOPES",
        "instagram_business_basic,instagram_business_content_publish",
    )
