import re
from urllib.parse import parse_qs, urlparse

from flask import abort, flash, jsonify, redirect, render_template, request, session, url_for
from app.models import ContactRequest, EventRegistration, EventSuggestion, Post
from app.routes import bp
from app.routes.helpers.access import (
    ACCESS_LABELS,
    get_access_scopes,
    get_scope_target,
    grant_scopes,
    has_any_access,
    has_scope,
    prune_expired_scopes,
    require_any_access,
    resolve_access_grant_by_phrase,
)

EVENT_REGISTRATION_PUBLIC_ID_RE = re.compile(r"^APP-[A-F0-9]{8}$", re.IGNORECASE)


def extract_event_registration_public_id(raw_value):
    value = (raw_value or "").strip()
    if not value:
        return None

    if EVENT_REGISTRATION_PUBLIC_ID_RE.fullmatch(value):
        return value.upper()

    parsed = urlparse(value)
    path = parsed.path.rstrip("/")
    if path.startswith("/event-registrations/"):
        public_id = path.rsplit("/", 1)[-1]
        if EVENT_REGISTRATION_PUBLIC_ID_RE.fullmatch(public_id):
            return public_id.upper()

    return None


def extract_unlock_url(raw_value):
    value = (raw_value or "").strip()
    if not value:
        return None

    parsed = urlparse(value)
    if parsed.path.rstrip("/") != "/admin/unlock":
        return None

    if parsed.netloc and parsed.netloc != request.host:
        return None

    query = parse_qs(parsed.query or "")
    phrase_values = query.get("phrase") or []
    if not phrase_values:
        return None

    phrase = phrase_values[0].strip()
    return url_for("main.admin_unlock", phrase=phrase)


def build_admin_scan_resolution(raw_value):
    value = (raw_value or "").strip()
    if not value:
        return {
            "ok": False,
            "message": "No QR code content was detected.",
        }

    unlock_url = extract_unlock_url(value)
    if unlock_url:
        return {
            "ok": True,
            "kind": "access_unlock_url",
            "target_url": unlock_url,
            "message": "Access-key unlock link detected.",
        }

    grant = resolve_access_grant_by_phrase(value)
    if grant["scopes"]:
        return {
            "ok": True,
            "kind": "access_phrase",
            "target_url": url_for("main.admin_unlock", phrase=value),
            "message": "Access phrase detected.",
        }

    public_id = extract_event_registration_public_id(value)
    if public_id:
        registration = EventRegistration.query.filter_by(public_id=public_id).first()
        if registration is None:
            return {
                "ok": False,
                "message": f"No event registration was found for {public_id}.",
            }

        if has_scope("event_registrations"):
            post = Post.query.get(registration.post_id)
            target_url = url_for(
                "main.admin_event_registration_queue",
                post_id=registration.post_id,
                q=registration.public_id,
            )
            message = (
                f"Registration {registration.public_id} resolved"
                + (f" for {post.display_title}." if post else ".")
            )
            return {
                "ok": True,
                "kind": "event_registration_admin",
                "target_url": target_url,
                "message": message,
            }

        return {
            "ok": True,
            "kind": "event_registration_public",
            "target_url": url_for("main.event_registration_status", public_id=registration.public_id),
            "message": f"Registration {registration.public_id} resolved.",
        }

    return {
        "ok": False,
        "message": "This QR code does not match a supported INCAS access key or event registration format.",
    }


@bp.before_app_request
def prune_access_session():
    prune_expired_scopes()


@bp.route("/admin", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        phrase = request.form.get("phrase", "").strip()
        grant = resolve_access_grant_by_phrase(phrase)
        scopes = grant["scopes"]

        if scopes:
            grant_scopes(scopes, expires_at=grant["expires_at"])
            return redirect(url_for("main.admin_corridor"))

        flash("Invalid access phrase.")

        if has_any_access():
            return redirect(url_for("main.admin_corridor"))

    if has_any_access():
        return redirect(url_for("main.admin_corridor"))

    return render_template("admin/login.html")


@bp.route("/admin/unlock")
def admin_unlock():
    phrase = request.args.get("phrase", "").strip()
    grant = resolve_access_grant_by_phrase(phrase)
    scopes = grant["scopes"]

    if scopes:
        grant_scopes(scopes, expires_at=grant["expires_at"])
        return redirect(url_for("main.admin_corridor"))

    flash("Invalid or expired access key.")

    if has_any_access():
        return redirect(url_for("main.admin_corridor"))

    return redirect(url_for("main.admin_login"))


@bp.route("/admin/access/<scope>", methods=["GET", "POST"])
def admin_scope_access(scope):
    if scope not in ACCESS_LABELS:
        abort(404)

    if has_scope(scope):
        return redirect(get_scope_target(scope))

    if request.method == "POST":
        phrase = request.form.get("phrase", "").strip()
        grant = resolve_access_grant_by_phrase(phrase)
        resolved_scopes = grant["scopes"]

        if scope in resolved_scopes:
            grant_scopes(resolved_scopes, expires_at=grant["expires_at"])
            return redirect(get_scope_target(scope))

        if resolved_scopes:
            labels = ", ".join(ACCESS_LABELS.get(item, item) for item in resolved_scopes)
            flash(
                f"This phrase unlocks {labels}, "
                f"not {ACCESS_LABELS[scope]}."
            )
        else:
            flash("Invalid access phrase.")

    return render_template(
        "admin/scope_access.html",
        scope=scope,
        scope_label=ACCESS_LABELS[scope],
    )


@bp.route("/admin/corridor")
def admin_corridor():
    guard = require_any_access()
    if guard:
        return guard

    stats = {
        "unread_forms": ContactRequest.query.count() + EventSuggestion.query.count(),
        "posts_today": 0,
        "visits_today": 17,
    }

    doors = [
        {
            "label": "Posts and Events",
            "scope": "posts",
            "is_open": has_scope("posts"),
            "url": url_for("main.admin_posts") if has_scope("posts") else None,
        },
        {
            "label": "Event Registrations",
            "scope": "event_registrations",
            "is_open": has_scope("event_registrations"),
            "url": url_for("main.admin_event_registrations") if has_scope("event_registrations") else None,
        },
        {
            "label": "Language Tandem",
            "scope": "language_tandem",
            "is_open": has_scope("language_tandem"),
            "url": url_for("main.admin_language_tandem") if has_scope("language_tandem") else None,
        },
        {
            "label": "Tandem Corrections",
            "scope": "language_tandem_corrections",
            "is_open": has_scope("language_tandem_corrections"),
            "url": url_for("main.admin_language_tandem") if has_scope("language_tandem_corrections") else None,
        },
        {
            "label": "Forms",
            "scope": "forms",
            "is_open": has_scope("forms"),
            "url": url_for("main.admin_forms") if has_scope("forms") else None,
        },
        {
            "label": "Access Keys",
            "scope": "access_keys",
            "is_open": has_scope("access_keys"),
            "url": url_for("main.admin_access_keys") if has_scope("access_keys") else None,
        },
    ]

    return render_template(
        "admin/corridor.html",
        stats=stats,
        doors=doors,
        access_scopes=get_access_scopes(),
        access_labels=ACCESS_LABELS,
    )


@bp.route("/admin/scan")
def admin_qr_scanner():
    guard = require_any_access()
    if guard:
        return guard

    return render_template("admin/scan.html")


@bp.route("/admin/scan/resolve", methods=["POST"])
def admin_qr_scan_resolve():
    guard = require_any_access()
    if guard:
        return jsonify({"ok": False, "message": "Access required."}), 403

    payload = request.get_json(silent=True) or {}
    result = build_admin_scan_resolution(payload.get("code", ""))
    status_code = 200 if result.get("ok") else 422
    return jsonify(result), status_code


@bp.route("/admin/logout")
def admin_logout():
    session.clear()
    return redirect(url_for("main.index"))
