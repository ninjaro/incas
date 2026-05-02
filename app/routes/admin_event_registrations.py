from flask import flash, redirect, render_template, request, url_for

from app.models import (
    EVENT_REGISTRATION_CAPACITY_STATUSES,
    EVENT_REGISTRATION_STATUS_LABELS,
    EVENT_REGISTRATION_STATUS_WAITING_LIST,
    EventRegistration,
    Post,
    db,
)
from app.routes import bp
from app.routes.helpers.access import require_scope
from app.routes.helpers.event_registrations import (
    EVENT_REGISTRATION_STATUS_CHOICES,
    build_post_registration_summary,
    promote_waiting_list_for_post,
    search_event_registrations,
)


def get_event_registration_status_options():
    return [
        {
            "value": status,
            "label": EVENT_REGISTRATION_STATUS_LABELS.get(
                status,
                status.replace("_", " ").title(),
            ),
        }
        for status in EVENT_REGISTRATION_STATUS_CHOICES
    ]


def build_waiting_list_positions(post_id):
    waiting_ids = [
        item_id
        for item_id, in (
            EventRegistration.query
            .with_entities(EventRegistration.id)
            .filter(EventRegistration.post_id == post_id)
            .filter(EventRegistration.status == EVENT_REGISTRATION_STATUS_WAITING_LIST)
            .order_by(EventRegistration.created_at.asc(), EventRegistration.id.asc())
            .all()
        )
    ]
    return {
        item_id: index + 1
        for index, item_id in enumerate(waiting_ids)
    }


@bp.route("/admin/event-registrations")
def admin_event_registrations():
    guard = require_scope("event_registrations")
    if guard:
        return guard

    query_text = request.args.get("q", "").strip()
    queue_posts = Post.query.order_by(Post.starts_at.asc(), Post.updated_at.desc()).all()
    queue_posts = [item for item in queue_posts if item.has_registration_queue]
    queue_summaries = {
        item.id: build_post_registration_summary(item)
        for item in queue_posts
    }

    search_items = []
    search_post_lookup = {}
    if query_text:
        search_items = search_event_registrations(query_text).all()
        post_ids = {item.post_id for item in search_items}
        if post_ids:
            search_post_lookup = {
                item.id: item
                for item in Post.query.filter(Post.id.in_(post_ids)).all()
            }

    return render_template(
        "admin/event_registrations/index.html",
        queue_posts=queue_posts,
        queue_summaries=queue_summaries,
        query_text=query_text,
        search_items=search_items,
        search_post_lookup=search_post_lookup,
    )


@bp.route("/admin/event-registrations/<int:post_id>")
def admin_event_registration_queue(post_id):
    guard = require_scope("event_registrations")
    if guard:
        return guard

    post = Post.query.get_or_404(post_id)
    if not post.has_registration_queue:
        flash("This event does not have a registration queue.")
        return redirect(url_for("main.admin_event_registrations"))

    query_text = request.args.get("q", "").strip()
    items = search_event_registrations(query_text, post_id=post.id).all()
    waiting_list_positions = build_waiting_list_positions(post.id)

    return render_template(
        "admin/event_registrations/queue.html",
        post=post,
        items=items,
        query_text=query_text,
        queue_summary=build_post_registration_summary(post),
        status_options=get_event_registration_status_options(),
        waiting_list_positions=waiting_list_positions,
    )


@bp.route("/admin/event-registrations/<int:registration_id>/status", methods=["POST"])
def admin_event_registration_status_update(registration_id):
    guard = require_scope("event_registrations")
    if guard:
        return guard

    item = EventRegistration.query.get_or_404(registration_id)
    post = Post.query.get_or_404(item.post_id)
    query_text = request.form.get("q", "").strip()
    next_status = request.form.get("status", "").strip()

    if next_status not in EVENT_REGISTRATION_STATUS_CHOICES:
        flash("Select a valid application status.")
        return redirect(url_for("main.admin_event_registration_queue", post_id=post.id, q=query_text))

    current_status = item.status
    current_uses_capacity = current_status in EVENT_REGISTRATION_CAPACITY_STATUSES
    next_uses_capacity = next_status in EVENT_REGISTRATION_CAPACITY_STATUSES
    reserved_without_item = post.registration_reserved_count - (1 if current_uses_capacity else 0)

    if next_uses_capacity and reserved_without_item >= (post.registration_limit or 0):
        flash("No reserved place is available. Free one approved or waiting-for-payment spot first.")
        return redirect(url_for("main.admin_event_registration_queue", post_id=post.id, q=query_text))

    item.status = next_status
    promoted = promote_waiting_list_for_post(post)
    db.session.commit()

    if next_status == current_status:
        flash(f"Application {item.public_id} stays at {item.status_label}.")
    elif promoted:
        flash(
            f"Application {item.public_id} moved to {item.status_label}. "
            f"{len(promoted)} waiting-list application(s) moved to Waiting for Payment."
        )
    else:
        flash(f"Application {item.public_id} moved to {item.status_label}.")

    return redirect(url_for("main.admin_event_registration_queue", post_id=post.id, q=query_text))
