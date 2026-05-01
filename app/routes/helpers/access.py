import hashlib
import hmac
from datetime import datetime

from flask import current_app, flash, redirect, session, url_for

from app.models import AccessKey, get_configured_local_now

ACCESS_TARGETS = {
    "posts": "main.admin_posts",
    "language_tandem": "main.admin_language_tandem",
    "language_tandem_corrections": "main.admin_language_tandem",
    "forms": "main.admin_forms",
    "access_keys": "main.admin_access_keys",
}

ACCESS_LABELS = {
    "posts": "Posts and Events",
    "language_tandem": "Language Tandem",
    "language_tandem_corrections": "Tandem Corrections",
    "forms": "Forms",
    "access_keys": "Access Keys",
}

def get_access_scopes():
    prune_expired_scopes()
    return session.get("access_scopes", [])


def prune_expired_scopes():
    scopes = list(session.get("access_scopes", []))
    expires_by_scope = dict(session.get("access_scope_expires", {}))

    if not scopes or not expires_by_scope:
        return

    now_local = get_configured_local_now()
    active_scopes = []
    active_expires = {}
    changed = False

    for scope in scopes:
        raw_expires_at = expires_by_scope.get(scope)
        if not raw_expires_at:
            active_scopes.append(scope)
            continue

        try:
            expires_at = datetime.fromisoformat(raw_expires_at)
        except ValueError:
            changed = True
            continue

        if expires_at <= now_local:
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


def has_any_access():
    return len(get_access_scopes()) > 0


def has_scope(scope):
    return scope in get_access_scopes()


def grant_scope(scope):
    grant_scopes([scope])

def grant_scopes(scopes, expires_at=None):
    current = list(get_access_scopes())
    scope_expires = dict(session.get("access_scope_expires", {}))
    expires_value = expires_at.isoformat(timespec="minutes") if expires_at else None

    for scope in scopes:
        if scope not in current:
            current.append(scope)
        if expires_value:
            scope_expires[scope] = expires_value
        else:
            scope_expires.pop(scope, None)

    session["access_scopes"] = current
    if scope_expires:
        session["access_scope_expires"] = scope_expires
    else:
        session.pop("access_scope_expires", None)

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
        return {"scopes": [], "expires_at": None}

    digest = hashlib.sha256(phrase.encode("utf-8")).hexdigest()

    for scope, expected_digest in current_app.config["ACCESS_HASHES"].items():
        if hmac.compare_digest(digest, expected_digest):
            return {"scopes": [scope], "expires_at": None}

    now_local = get_configured_local_now()

    items = (
        AccessKey.query
        .filter(AccessKey.expires_at >= now_local)
        .order_by(AccessKey.created_at.desc())
        .all()
    )

    for item in items:
        if hmac.compare_digest(phrase, item.key):
            return {
                "scopes": [scope for scope in item.scopes_list if scope in ACCESS_LABELS],
                "expires_at": item.expires_at,
            }

    return {"scopes": [], "expires_at": None}


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
