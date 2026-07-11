from flask import jsonify

from app.api import api_bp, api_error, get_json_body
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
    return {
        "capabilities": sorted(get_capabilities()),
        "capabilityLabels": ACCESS_LABELS,
        "sessionAuditId": get_session_audit_id(),
        "hasAccessKeys": has_any_access_key(),
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

    grant = resolve_access_grant_by_phrase(phrase)
    if not grant["scopes"]:
        return api_error("key_invalid", "This access key is not valid.", status=403)

    new_scopes = [scope for scope in grant["scopes"] if scope not in get_access_scopes()]
    grant_scopes(grant["scopes"], expires_at=grant["expires_at"], key_id=grant.get("key_id"))
    if grant.get("key_id"):
        from app.models import AccessKey, db, get_configured_local_now

        item = db.session.get(AccessKey, grant["key_id"])
        if item is not None:
            item.last_used_at = get_configured_local_now()
            db.session.commit()

    payload = serialize_session()
    payload["unlockedScopes"] = grant["scopes"]
    payload["newScopes"] = new_scopes
    return jsonify(payload)
