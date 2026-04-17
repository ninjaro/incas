import hashlib
import hmac
from datetime import datetime

from flask import current_app, flash, redirect, session, url_for

from app.models import AccessKey

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
    return session.get("access_scopes", [])


def has_any_access():
    return len(get_access_scopes()) > 0


def has_scope(scope):
    return scope in get_access_scopes()


def grant_scope(scope):
    scopes = list(get_access_scopes())
    if scope not in scopes:
        scopes.append(scope)
        session["access_scopes"] = scopes

def grant_scopes(scopes):
    current = list(get_access_scopes())
    for scope in scopes:
        if scope not in current:
            current.append(scope)
    session["access_scopes"] = current

def get_scope_target(scope):
    endpoint = ACCESS_TARGETS.get(scope)
    if endpoint is None:
        return url_for("main.admin_corridor")
    return url_for(endpoint)


def resolve_scopes_by_phrase(phrase):
    phrase = (phrase or "").strip()
    if not phrase:
        return []

    digest = hashlib.sha256(phrase.encode("utf-8")).hexdigest()

    for scope, expected_digest in current_app.config["ACCESS_HASHES"].items():
        if hmac.compare_digest(digest, expected_digest):
            return [scope]

    now = datetime.utcnow()

    items = (
        AccessKey.query
        .filter(AccessKey.expires_at >= now)
        .order_by(AccessKey.created_at.desc())
        .all()
    )

    for item in items:
        if hmac.compare_digest(phrase, item.key):
            return [scope for scope in item.scopes_list if scope in ACCESS_LABELS]

    return []


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
