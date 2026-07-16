"""Shared remote-image policy used by validation and CSP generation."""

from urllib.parse import urlparse

from flask import current_app


DEFAULT_REMOTE_IMAGE_ORIGINS = (
    "https://tile.openstreetmap.org",
    "https://cdn.simulated.social",
)


def configured_remote_image_origins() -> tuple[str, ...]:
    configured = current_app.config.get("REMOTE_IMAGE_ORIGINS", DEFAULT_REMOTE_IMAGE_ORIGINS)
    if isinstance(configured, str):
        configured = configured.split()
    origins = []
    for value in configured or ():
        parsed = urlparse(str(value).strip())
        if parsed.scheme in {"http", "https"} and parsed.netloc:
            origins.append(f"{parsed.scheme}://{parsed.netloc}")
    return tuple(dict.fromkeys(origins))


def image_url_is_allowed(value: str) -> bool:
    value = (value or "").strip()
    if not value:
        return True
    parsed = urlparse(value)
    if not parsed.scheme and not parsed.netloc and not value.startswith("//"):
        return True
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return False
    origin = f"{parsed.scheme}://{parsed.netloc}"
    return origin in configured_remote_image_origins()


def content_security_policy() -> str:
    image_sources = " ".join(configured_remote_image_origins())
    return "; ".join(
        (
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            f"img-src 'self' data: blob:{f' {image_sources}' if image_sources else ''}",
            "connect-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "frame-ancestors 'self'",
        )
    )

