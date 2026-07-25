import hashlib
import json
import secrets

from flask import jsonify

from app.api import api_bp, api_error, get_json_body, require_capability, validation_error
from app.datetime_utils import parse_iso_to_utc, serialize_utc, utc_now
from app.models import AccessKey, db
from app.routes.helpers.access import ACCESS_LABELS


def serialize_access_key(item):
    now = utc_now()
    if item.revoked_at is not None:
        status = "revoked"
    elif item.expires_at <= now:
        status = "expired"
    else:
        status = "active"
    prefix = item.key_prefix or (item.key[:8] if not item.key.startswith("sha256:") else "legacy")
    return {
        "id": item.id,
        "label": item.label,
        "prefix": prefix,
        "scopes": item.scopes_list,
        "status": status,
        "expiresAt": serialize_utc(item.expires_at),
        "revokedAt": serialize_utc(item.revoked_at),
        "lastUsedAt": serialize_utc(item.last_used_at),
        "createdAt": serialize_utc(item.created_at),
    }


@api_bp.get("/admin/access-keys")
@require_capability("access_keys")
def api_admin_access_keys():
    items = AccessKey.query.order_by(AccessKey.created_at.desc()).all()
    scopes = [
        {"value": scope, "label": label}
        for scope, label in ACCESS_LABELS.items()
        if scope not in {"access_keys", "language_tandem"}
    ]
    return jsonify({"items": [serialize_access_key(item) for item in items], "availableScopes": scopes})


@api_bp.post("/admin/access-keys")
@require_capability("access_keys")
def api_admin_access_key_create():
    body = get_json_body()
    label = (body.get("label") or "").strip()
    scopes = body.get("scopes")
    errors = {}
    if not isinstance(scopes, list) or not scopes:
        errors["scopes"] = "Select at least one scope."
        scopes = []
    allowed = set(ACCESS_LABELS) - {"access_keys", "language_tandem"}
    unknown = [scope for scope in scopes if scope not in allowed]
    if unknown:
        errors["scopes"] = "One or more scopes are not available."
    try:
        expires_at = parse_iso_to_utc((body.get("expiresAt") or "").strip())
    except (TypeError, ValueError):
        expires_at = None
        errors["expiresAt"] = "Enter a valid expiration date and time."
    if expires_at is not None and expires_at <= utc_now():
        errors["expiresAt"] = "Expiration must be in the future."
    if errors:
        return validation_error(errors)

    secret = secrets.token_urlsafe(24)
    item = AccessKey(
        key=f"sha256:{hashlib.sha256(secret.encode('utf-8')).hexdigest()}",
        key_prefix=secret[:8],
        label=label[:160],
        scopes=json.dumps(list(dict.fromkeys(scopes))),
        expires_at=expires_at,
    )
    db.session.add(item)
    db.session.commit()
    payload = serialize_access_key(item)
    payload.update(
        {
            "secret": secret,
            "unlockFragment": f"#access-key={secret}",
            "secretVisibleOnce": True,
        }
    )
    return jsonify(payload), 201


@api_bp.post("/admin/access-keys/<int:key_id>/revoke")
@require_capability("access_keys")
def api_admin_access_key_revoke(key_id):
    item = db.session.get(AccessKey, key_id)
    if item is None:
        return api_error("not_found", "Access key not found.", status=404)
    if item.revoked_at is None:
        item.revoked_at = utc_now()
        db.session.commit()
    return jsonify(serialize_access_key(item))


@api_bp.post("/admin/access-keys/<int:key_id>/expire")
@require_capability("access_keys")
def api_admin_access_key_expire(key_id):
    item = db.session.get(AccessKey, key_id)
    if item is None:
        return api_error("not_found", "Access key not found.", status=404)
    item.expires_at = utc_now()
    db.session.commit()
    return jsonify(serialize_access_key(item))
