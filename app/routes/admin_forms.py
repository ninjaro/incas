from flask import flash, redirect, render_template, url_for

from app.models import ContactRequest, EventSuggestion, db
from app.routes import bp
from app.routes.helpers.access import require_scope


@bp.route("/admin/forms")
def admin_forms():
    guard = require_scope("forms")
    if guard:
        return guard

    contact_items = ContactRequest.query.order_by(ContactRequest.created_at.desc()).all()
    event_items = EventSuggestion.query.order_by(EventSuggestion.created_at.desc()).all()

    return render_template(
        "admin/forms/index.html",
        contact_items=contact_items,
        event_items=event_items,
    )


@bp.route("/admin/forms/contact/<int:item_id>/delete", methods=["POST"])
def admin_contact_request_delete(item_id):
    guard = require_scope("forms")
    if guard:
        return guard

    item = ContactRequest.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    flash("Contact request deleted.")
    return redirect(url_for("main.admin_forms"))


@bp.route("/admin/forms/event-suggestion/<int:item_id>/delete", methods=["POST"])
def admin_event_suggestion_delete(item_id):
    guard = require_scope("forms")
    if guard:
        return guard

    item = EventSuggestion.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    flash("Event suggestion deleted.")
    return redirect(url_for("main.admin_forms"))
