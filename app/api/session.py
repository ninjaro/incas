import hashlib

from flask import jsonify, request, session

from app.api import api_bp, api_error, get_json_body
from app.datetime_utils import utc_now
from app.models import AccessKey, AccessUnlockAttempt, db
from app.rate_limit import consume_rate_limit
from app.routes.helpers.access import (
    ACCESS_LABELS,
    get_access_scopes,
    get_capabilities,
    get_session_audit_id,
    grant_scopes,
    has_any_access_key,
    resolve_access_grant_by_phrase,
)


def serialize_session():
    capabilities = sorted(get_capabilities())
    expiry_values = session.get("access_scope_expires", {}).values()
    return {
        "capabilities": capabilities,
        "capabilityLabels": ACCESS_LABELS,
        "sessionAuditId": get_session_audit_id(),
        "hasAccessKeys": has_any_access_key(),
        "nextExpiryAt": min(expiry_values, default=None),
    }


@api_bp.get("/session")
def api_session():
    return jsonify(serialize_session())


@api_bp.post("/access/unlock")
def api_access_unlock():
    body = get_json_body()
    phrase = (body.get("key") or "").strip()
    if not phrase:
        return api_error("key_required", "Enter an access key.", status=422)

    session_audit_id = get_session_audit_id()
    source = request.remote_addr or "unknown"
    limits = (
        ("access.unlock.ip", 30, source),
        ("access.unlock.session", 10, session_audit_id),
    )
    for scope, limit, identifier in limits:
        allowed, retry_after = consume_rate_limit(
            scope,
            limit,
            15 * 60,
            identifier=identifier,
        )
        if not allowed:
            _record_unlock_attempt(source, session_audit_id, succeeded=False)
            response, status = api_error(
                "rate_limited",
                "Too many access-key attempts. Try again later.",
                status=429,
            )
            response.headers["Retry-After"] = str(retry_after)
            return response, status

    grant = resolve_access_grant_by_phrase(phrase)
    if not grant["scopes"]:
        _record_unlock_attempt(source, session_audit_id, succeeded=False)
        return api_error("key_invalid", "This access key is not valid.", status=403)

    new_scopes = [scope for scope in grant["scopes"] if scope not in get_access_scopes()]
    session.permanent = True
    grant_scopes(grant["scopes"], expires_at=grant["expires_at"], key_id=grant.get("key_id"))
    if grant.get("key_id"):
        item = db.session.get(AccessKey, grant["key_id"])
        if item is not None:
            item.last_used_at = utc_now()
    _record_unlock_attempt(source, session_audit_id, succeeded=True, commit=False)
    db.session.commit()

    payload = serialize_session()
    payload["unlockedScopes"] = grant["scopes"]
    payload["newScopes"] = new_scopes
    return jsonify(payload)


@api_bp.post("/access/lock")
def api_access_lock():
    session.pop("access_scopes", None)
    session.pop("access_scope_expires", None)
    session.pop("access_scope_key_ids", None)
    return jsonify(serialize_session())


def _record_unlock_attempt(source, session_audit_id, *, succeeded, commit=True):
    db.session.add(
        AccessUnlockAttempt(
            source_hash=hashlib.sha256(source.encode("utf-8")).hexdigest(),
            session_audit_id=session_audit_id,
            succeeded=succeeded,
        )
    )
    if commit:
        db.session.commit()
