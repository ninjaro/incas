from flask import abort, flash, redirect, render_template, request, session, url_for
from app.models import ContactRequest, EventSuggestion
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


@bp.route("/admin/logout")
def admin_logout():
    session.clear()
    return redirect(url_for("main.index"))
