"""Consistent datetime handling for API input, storage, and output.

Database timestamps use naive UTC for compatibility with SQLite and existing
PostgreSQL columns. API values are serialized with an explicit ``Z`` suffix.
Naive user input is interpreted in the configured application timezone.
"""

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from flask import current_app


UTC = timezone.utc


def configured_timezone() -> ZoneInfo:
    try:
        name = current_app.config.get("LOCAL_TIMEZONE", "Europe/Berlin")
    except RuntimeError:
        name = "Europe/Berlin"
    try:
        return ZoneInfo(name)
    except Exception:
        return ZoneInfo("Europe/Berlin")


def utc_now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def local_now() -> datetime:
    return datetime.now(configured_timezone()).replace(tzinfo=None)


def to_utc_naive(value: datetime, *, assume_local: bool = True) -> datetime:
    if value.tzinfo is None:
        if not assume_local:
            return value
        value = value.replace(tzinfo=configured_timezone())
    return value.astimezone(UTC).replace(tzinfo=None)


def parse_iso_to_utc(value) -> datetime:
    if not isinstance(value, str):
        raise ValueError("datetime must be a string")
    normalized = value.strip()
    if not normalized:
        raise ValueError("datetime is empty")
    if normalized.endswith("Z"):
        normalized = f"{normalized[:-1]}+00:00"
    return to_utc_naive(datetime.fromisoformat(normalized))


def serialize_utc(value: datetime | None, *, timespec: str = "seconds") -> str | None:
    if value is None:
        return None
    aware = value if value.tzinfo is not None else value.replace(tzinfo=UTC)
    return aware.astimezone(UTC).isoformat(timespec=timespec).replace("+00:00", "Z")


def utc_to_local(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    aware = value if value.tzinfo is not None else value.replace(tzinfo=UTC)
    return aware.astimezone(configured_timezone())

