import json
import secrets
from datetime import datetime, timedelta

from flask import flash, redirect, render_template, request, url_for

from app.models import AccessKey, db, get_configured_local_now
from app.routes import bp
from app.routes.helpers.access import ACCESS_LABELS, require_scope
from app.routes.helpers.content import format_datetime_local


@bp.route("/admin/access-keys", methods=["GET", "POST"])
def admin_access_keys():
    guard = require_scope("access_keys")
    if guard:
        return guard

    now_local = get_configured_local_now()

    available_scopes = [
        {"value": scope, "label": label}
        for scope, label in ACCESS_LABELS.items()
        if scope != "access_keys"
    ]

    values = {
        "scopes": [],
        "expires_at": format_datetime_local(now_local + timedelta(days=1)),
    }

    if request.method == "POST":
        values["scopes"] = request.form.getlist("scopes")
        values["expires_at"] = request.form.get("expires_at", "").strip()

        expires_at = None
        if values["expires_at"]:
            try:
                expires_at = datetime.strptime(values["expires_at"], "%Y-%m-%dT%H:%M")
            except ValueError:
                expires_at = None

        if not values["scopes"]:
            flash("Select at least one scope.")
        elif expires_at is None:
            flash("Enter a valid expiration date and time.")
        else:
            item = AccessKey(
                key=secrets.token_urlsafe(24),
                scopes=json.dumps(values["scopes"]),
                expires_at=expires_at,
            )
            db.session.add(item)
            db.session.commit()
            flash("Access key created.")
            return redirect(url_for("main.admin_access_keys"))

    items = AccessKey.query.order_by(AccessKey.created_at.desc()).all()

    return render_template(
        "admin/access_keys/index.html",
        items=items,
        values=values,
        available_scopes=available_scopes,
        ACCESS_LABELS=ACCESS_LABELS,
        now_local=now_local,
    )


@bp.route("/admin/access-keys/<int:key_id>/delete", methods=["POST"])
def admin_access_key_delete(key_id):
    guard = require_scope("access_keys")
    if guard:
        return guard

    item = AccessKey.query.get_or_404(key_id)
    db.session.delete(item)
    db.session.commit()
    flash("Access key deleted.")
    return redirect(url_for("main.admin_access_keys"))
