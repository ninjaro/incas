"""Versioned JSON API consumed by the React frontend.

Conventions:
- All endpoints live under /api/v1.
- Errors use one consistent shape:
      {"error": {"code": "...", "message": "...", "details": {...}}}
- Every protected endpoint checks capabilities server-side and returns 403
  regardless of what the frontend renders.
- Write requests must carry the "X-INCAS-Api: 1" header. Browsers cannot add
  custom headers to cross-site form posts, and cross-origin fetch with a
  custom header triggers a CORS preflight the server never approves, so this
  acts as CSRF protection for the cookie-based session.
"""

from functools import wraps

from flask import Blueprint, jsonify, request

from app.routes.helpers.access import get_capabilities, has_capability

api_bp = Blueprint("api", __name__, url_prefix="/api/v1")

CSRF_HEADER = "X-INCAS-Api"

WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def api_error(code, message, status=400, details=None):
    payload = {"error": {"code": code, "message": message}}
    if details:
        payload["error"]["details"] = details
    return jsonify(payload), status


def validation_error(fields):
    return api_error(
        "validation_failed",
        "Some fields are invalid.",
        status=422,
        details={"fields": fields},
    )


def require_capability(capability):
    def decorator(handler):
        @wraps(handler)
        def wrapper(*args, **kwargs):
            if not has_capability(capability):
                return api_error(
                    "capability_required",
                    "This action requires an additional access key.",
                    status=403,
                    details={"capability": capability},
                )
            return handler(*args, **kwargs)

        return wrapper

    return decorator


@api_bp.before_request
def enforce_write_header():
    # Provider webhooks authenticate through adapter-level signature checks,
    # not browser sessions, so the CSRF header does not apply to them.
    if request.path.endswith("/payments/webhook"):
        return None
    if request.method in WRITE_METHODS and request.headers.get(CSRF_HEADER) != "1":
        return api_error(
            "csrf_header_missing",
            f"Write requests must include the {CSRF_HEADER} header.",
            status=403,
        )
    return None


@api_bp.errorhandler(404)
def api_not_found(_error):
    return api_error("not_found", "Resource not found.", status=404)


def get_json_body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


# Import endpoint modules for their route side effects.
from app.api import access_keys, forms, karaoke, payments, posts, public, registrations, session, tandem, themes  # noqa: E402,F401

__all__ = [
    "api_bp",
    "api_error",
    "get_capabilities",
    "get_json_body",
    "require_capability",
    "validation_error",
]
