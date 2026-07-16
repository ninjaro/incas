import hashlib
import hmac
from uuid import uuid4

from flask import current_app, flash, redirect, session, url_for

from app.datetime_utils import parse_iso_to_utc, serialize_utc, utc_now
from app.models import AccessKey, db

ACCESS_TARGETS = {
    "posts": "main.admin_posts",
    "event_registrations": "main.admin_event_registrations",
    "language_tandem": "main.admin_language_tandem",
    "language_tandem_corrections": "main.admin_language_tandem",
    "forms": "main.admin_forms",
    "access_keys": "main.admin_access_keys",
}

ACCESS_LABELS = {
    "posts": "Posts and Events",
    "event_registrations": "Event Registrations",
    "language_tandem": "Language Tandem",
    "language_tandem_blind": "Tandem Matching (Blind)",
    "language_tandem_private": "Tandem Contact Details",
    "language_tandem_corrections": "Tandem Corrections",
    "forms": "Forms",
    "access_keys": "Access Keys",
    "theme_review": "Theme Review and Voting",
    "theme_force": "Theme Force",
    "karaoke_queue": "Karaoke Queue",
}

# Each scope unlocks a set of capabilities. Stronger scopes are strict
# supersets of the weaker ones so the admin UI can stay a single panel.
# Legacy keys ("language_tandem", "language_tandem_corrections") keep working
# by expanding to the closest new capabilities.
SCOPE_CAPABILITIES = {
    "posts": {"posts"},
    "event_registrations": {"event_registrations"},
    "language_tandem": {"language_tandem_blind", "language_tandem_private"},
    "language_tandem_blind": {"language_tandem_blind"},
    "language_tandem_private": {"language_tandem_blind", "language_tandem_private"},
    "language_tandem_corrections": {
        "language_tandem_blind",
        "language_tandem_private",
        "language_tandem_corrections",
    },
    "forms": {"forms"},
    "access_keys": {"access_keys"},
    "theme_review": {"theme_review"},
    "theme_force": {"theme_review", "theme_force"},
    "karaoke_queue": {"karaoke_queue"},
}

def get_access_scopes():
    prune_expired_scopes()
    return session.get("access_scopes", [])


def prune_expired_scopes():
    scopes = list(session.get("access_scopes", []))
    expires_by_scope = dict(session.get("access_scope_expires", {}))
    key_ids_by_scope = dict(session.get("access_scope_key_ids", {}))

    if not scopes or not expires_by_scope:
        return

    now = utc_now()
    active_scopes = []
    active_expires = {}
    changed = False

    for scope in scopes:
        key_id = key_ids_by_scope.get(scope)
        if key_id:
            item = db.session.get(AccessKey, key_id)
            if item is None or item.revoked_at is not None or item.expires_at <= now:
                changed = True
                continue
        raw_expires_at = expires_by_scope.get(scope)
        if not raw_expires_at:
            active_scopes.append(scope)
            continue

        try:
            expires_at = parse_iso_to_utc(raw_expires_at)
        except ValueError:
            changed = True
            continue

        if expires_at <= now:
            changed = True
            continue

        active_scopes.append(scope)
        active_expires[scope] = raw_expires_at

    if changed or active_scopes != scopes:
        session["access_scopes"] = active_scopes

    if active_expires:
        session["access_scope_expires"] = active_expires
    else:
        session.pop("access_scope_expires", None)
    session["access_scope_key_ids"] = {
        scope: key_ids_by_scope[scope]
        for scope in active_scopes
        if scope in key_ids_by_scope
    }


def has_any_access():
    return len(get_access_scopes()) > 0


def has_any_access_key():
    return AccessKey.query.first() is not None


def has_scope(scope):
    return scope in get_access_scopes()


def get_capabilities():
    capabilities = set()
    for scope in get_access_scopes():
        capabilities.update(SCOPE_CAPABILITIES.get(scope, {scope}))
    return capabilities


def has_capability(capability):
    return capability in get_capabilities()


def get_session_audit_id():
    """Opaque per-session identifier used for votes and audit trails.

    Never derived from access keys, so audit rows cannot leak key material.
    """
    audit_id = session.get("session_audit_id")
    if not audit_id:
        audit_id = uuid4().hex[:16]
        session["session_audit_id"] = audit_id
    return audit_id


def grant_scope(scope):
    grant_scopes([scope])

def grant_scopes(scopes, expires_at=None, key_id=None):
    current = list(get_access_scopes())
    scope_expires = dict(session.get("access_scope_expires", {}))
    key_ids_by_scope = dict(session.get("access_scope_key_ids", {}))
    expires_value = serialize_utc(expires_at, timespec="minutes") if expires_at else None

    for scope in scopes:
        if scope not in current:
            current.append(scope)
        if expires_value:
            scope_expires[scope] = expires_value
        else:
            scope_expires.pop(scope, None)
        if key_id:
            key_ids_by_scope[scope] = key_id
        else:
            key_ids_by_scope.pop(scope, None)

    session["access_scopes"] = current
    if scope_expires:
        session["access_scope_expires"] = scope_expires
    else:
        session.pop("access_scope_expires", None)
    session["access_scope_key_ids"] = key_ids_by_scope

def get_scope_target(scope):
    endpoint = ACCESS_TARGETS.get(scope)
    if endpoint is None:
        return url_for("main.admin_corridor")
    return url_for(endpoint)


def resolve_scopes_by_phrase(phrase):
    return resolve_access_grant_by_phrase(phrase)["scopes"]


def resolve_access_grant_by_phrase(phrase):
    phrase = (phrase or "").strip()
    if not phrase:
        return {"scopes": [], "expires_at": None, "key_id": None}

    digest = hashlib.sha256(phrase.encode("utf-8")).hexdigest()

    for scope, expected_digest in current_app.config["ACCESS_HASHES"].items():
        if hmac.compare_digest(digest, expected_digest):
            return {"scopes": [scope], "expires_at": None, "key_id": None}

    now = utc_now()

    items = (
        AccessKey.query
        .filter(AccessKey.expires_at > now)
        .filter(AccessKey.revoked_at.is_(None))
        .order_by(AccessKey.created_at.desc())
        .all()
    )

    for item in items:
        stored = item.key or ""
        matches = (
            hmac.compare_digest(f"sha256:{digest}", stored)
            if stored.startswith("sha256:")
            else hmac.compare_digest(phrase, stored)
        )
        if matches:
            return {
                "scopes": [scope for scope in item.scopes_list if scope in ACCESS_LABELS],
                "expires_at": item.expires_at,
                "key_id": item.id,
            }

    return {"scopes": [], "expires_at": None, "key_id": None}


def resolve_scope_by_phrase(phrase):
    scopes = resolve_scopes_by_phrase(phrase)
    if not scopes:
        return None
    return scopes[0]


def require_any_access():
    if has_any_access():
        return None
    return redirect(url_for("main.admin_login"))


def require_scope(scope):
    if has_scope(scope):
        return None

    flash(f"Access required: {ACCESS_LABELS.get(scope, scope)}.")

    if has_any_access():
        return redirect(url_for("main.admin_corridor"))

    return redirect(url_for("main.admin_login"))

def has_any_scope(scopes):
    return any(has_scope(scope) for scope in scopes)


def require_any_scope(scopes):
    if has_any_scope(scopes):
        return None

    labels = ", ".join(ACCESS_LABELS.get(scope, scope) for scope in scopes)
    flash(f"Access required: {labels}.")

    if has_any_access():
        return redirect(url_for("main.admin_corridor"))

    return redirect(url_for("main.admin_login"))


def has_tandem_matching_access():
    return has_scope("language_tandem")


def has_tandem_correction_access():
    return has_scope("language_tandem_corrections")


def require_tandem_any_access():
    return require_any_scope(["language_tandem", "language_tandem_corrections"])
