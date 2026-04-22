import json
import secrets
from datetime import datetime

from flask import flash, redirect, render_template, request, url_for

from app.models import AccessKey, db
from app.routes import bp
from app.routes.helpers.access import ACCESS_LABELS, require_scope


@bp.route("/admin/access-keys", methods=["GET", "POST"])
def admin_access_keys():
    guard = require_scope("access_keys")
    if guard:
        return guard

    available_scopes = [
        {"value": scope, "label": label}
        for scope, label in ACCESS_LABELS.items()
        if scope != "access_keys"
    ]

    values = {
        "scopes": [],
        "expires_at": "",
    }

    if request.method == "POST":
        values["scopes"] = request.form.getlist("scopes")
        values["expires_at"] = request.form.get("expires_at", "").strip()

        expires_at = None
        if values["expires_at"]:
            try:
                expires_at = datetime.fromisoformat(values["expires_at"])
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
