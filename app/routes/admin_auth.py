from flask import abort, flash, redirect, render_template, request, session, url_for

from app.routes import bp
from app.routes.helpers.access import (
    ACCESS_LABELS,
    get_access_scopes,
    get_scope_target,
    grant_scope,
    has_any_access,
    has_scope,
    require_any_access,
    resolve_scope_by_phrase,
)


@bp.route("/admin", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        phrase = request.form.get("phrase", "").strip()
        scope = resolve_scope_by_phrase(phrase)

        if scope is not None:
            grant_scope(scope)
            return redirect(url_for("main.admin_corridor"))

        flash("Invalid access phrase.")

        if has_any_access():
            return redirect(url_for("main.admin_corridor"))

    if has_any_access():
        return redirect(url_for("main.admin_corridor"))

    return render_template("admin/login.html")


@bp.route("/admin/access/<scope>", methods=["GET", "POST"])
def admin_scope_access(scope):
    if scope not in ACCESS_LABELS:
        abort(404)

    if has_scope(scope):
        return redirect(get_scope_target(scope))

    if request.method == "POST":
        phrase = request.form.get("phrase", "").strip()
        resolved_scope = resolve_scope_by_phrase(phrase)

        if resolved_scope == scope:
            grant_scope(scope)
            return redirect(get_scope_target(scope))

        if resolved_scope is not None:
            flash(
                f"This phrase unlocks {ACCESS_LABELS.get(resolved_scope, resolved_scope)}, "
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
        "unread_forms": 0,
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
