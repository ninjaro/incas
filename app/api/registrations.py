import re

from flask import Response, jsonify, request

from app.api import api_bp, api_error, get_json_body, require_capability, validation_error
from app.models import (
    EVENT_REGISTRATION_CAPACITY_STATUSES,
    EVENT_REGISTRATION_STATUS_APPROVED,
    EVENT_REGISTRATION_STATUS_CANCELLED,
    EVENT_REGISTRATION_STATUS_LABELS,
    EVENT_REGISTRATION_STATUS_WAITING_LIST,
    EVENT_REGISTRATION_STATUS_WAITING_PAYMENT,
    EVENT_REGISTRATION_STATUS_WAITING_REFUND,
    EventRegistration,
    PaymentTransaction,
    Post,
    db,
)
from app.routes.helpers.event_registrations import (
    build_event_registration_public_id,
    determine_initial_registration_status,
    get_waiting_list_position,
    promote_waiting_list_for_post,
    search_event_registrations,
    should_collect_diet_preference,
)


EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
STATUSES = {
    EVENT_REGISTRATION_STATUS_APPROVED,
    EVENT_REGISTRATION_STATUS_CANCELLED,
    EVENT_REGISTRATION_STATUS_WAITING_PAYMENT,
    EVENT_REGISTRATION_STATUS_WAITING_LIST,
    EVENT_REGISTRATION_STATUS_WAITING_REFUND,
}


def _payment_for_registration(item):
    payment = (
        PaymentTransaction.query
        .filter_by(registration_id=item.id)
        .order_by(PaymentTransaction.created_at.desc())
        .first()
    )
    if payment is None:
        return None
    return {
        "publicId": payment.public_id,
        "status": payment.status,
        "amountCents": payment.amount_cents,
        "currency": payment.currency,
        "isSimulated": bool(payment.is_simulated),
    }


def serialize_registration(item, post=None, *, private=False):
    post = post or db.session.get(Post, item.post_id)
    payload = {
        "id": item.id if private else None,
        "publicId": item.public_id,
        "name": item.full_name,
        "firstName": item.first_name if private else None,
        "lastName": item.last_name if private else None,
        "status": item.status,
        "statusLabel": EVENT_REGISTRATION_STATUS_LABELS.get(item.status, item.status_label),
        "waitingListPosition": get_waiting_list_position(item),
        "event": {
            "slug": post.slug,
            "title": post.display_title,
            "startsAt": post.starts_at.isoformat() if post.starts_at else None,
            "capacity": post.registration_limit,
            "placesRemaining": post.registration_places_remaining,
            "priceCents": post.registration_price_cents,
            "isDeposit": bool(post.registration_is_deposit),
        },
        "payment": _payment_for_registration(item),
        "trackingPath": f"/registrations/{item.public_id}",
        "createdAt": item.created_at.isoformat(),
        "updatedAt": item.updated_at.isoformat(),
    }
    if private:
        payload.update(
            {
                "email": item.email,
                "occupation": item.occupation,
                "dietPreference": item.diet_preference,
                "comment": item.comment,
            }
        )
    return payload


@api_bp.post("/public/events/<slug>/registrations")
def api_public_event_registration_create(slug):
    post = Post.query.filter_by(slug=slug).with_for_update().first()
    if post is None or not post.is_publicly_accessible:
        return api_error("not_found", "Event not found.", status=404)
    if not post.has_registration_queue:
        return api_error("registration_unavailable", "This event has no registration queue.", status=422)
    if not post.is_live:
        return api_error("registration_closed", "Registration is closed.", status=409)

    body = get_json_body()
    values = {
        "firstName": (body.get("firstName") or "").strip(),
        "lastName": (body.get("lastName") or "").strip(),
        "email": (body.get("email") or "").strip().lower(),
        "occupation": (body.get("occupation") or "").strip(),
        "dietPreference": (body.get("dietPreference") or "").strip(),
        "comment": (body.get("comment") or "").strip(),
    }
    errors = {}
    for field in ("firstName", "lastName", "occupation"):
        if not values[field]:
            errors[field] = "This field is required."
    if not EMAIL_RE.match(values["email"]):
        errors["email"] = "Enter a valid email address."
    if should_collect_diet_preference(post):
        if values["dietPreference"] not in {"vegan", "vegetarian", "omnivore"}:
            errors["dietPreference"] = "Select a meal preference."
    else:
        values["dietPreference"] = ""
    if errors:
        return validation_error(errors)

    duplicate = (
        EventRegistration.query
        .filter_by(post_id=post.id, email=values["email"])
        .filter(EventRegistration.status != EVENT_REGISTRATION_STATUS_CANCELLED)
        .first()
    )
    if duplicate is not None:
        return api_error(
            "registration_exists",
            "This email address already has an active registration.",
            status=409,
            details={"publicId": duplicate.public_id},
        )

    item = EventRegistration(
        public_id=build_event_registration_public_id(),
        post_id=post.id,
        first_name=values["firstName"][:120],
        last_name=values["lastName"][:120],
        email=values["email"][:255],
        occupation=values["occupation"][:120],
        diet_preference=values["dietPreference"],
        comment=values["comment"][:10000],
        status=determine_initial_registration_status(post),
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(serialize_registration(item, post)), 201


@api_bp.get("/public/registrations/<public_id>")
def api_public_registration_status(public_id):
    item = EventRegistration.query.filter_by(public_id=public_id).first()
    if item is None:
        return api_error("not_found", "Registration not found.", status=404)
    return jsonify(serialize_registration(item))


def _serialize_event_queue(post):
    return {
        "postId": post.id,
        "slug": post.slug,
        "title": post.display_title,
        "startsAt": post.starts_at.isoformat() if post.starts_at else None,
        "capacity": post.registration_limit or 0,
        "confirmedCount": EventRegistration.query.filter_by(post_id=post.id, status=EVENT_REGISTRATION_STATUS_APPROVED).count(),
        "reservedCount": post.registration_reserved_count,
        "waitingListCount": post.registration_waiting_list_count,
        "nonCancelledCount": post.registration_non_cancelled_count,
        "placesRemaining": post.registration_places_remaining,
        "priceCents": post.registration_price_cents,
        "isDeposit": bool(post.registration_is_deposit),
    }


@api_bp.get("/admin/event-registrations")
@require_capability("event_registrations")
def api_admin_event_registration_queues():
    posts = (
        Post.query
        .filter(Post.registration_limit_enabled.is_(True))
        .order_by(Post.starts_at.desc())
        .all()
    )
    return jsonify({"events": [_serialize_event_queue(post) for post in posts]})


@api_bp.get("/admin/events/<int:post_id>/registrations")
@require_capability("event_registrations")
def api_admin_event_registrations(post_id):
    post = db.session.get(Post, post_id)
    if post is None or not post.has_registration_queue:
        return api_error("not_found", "Event queue not found.", status=404)
    query = search_event_registrations(request.args.get("q", ""), post_id=post.id)
    status = request.args.get("status", "").strip()
    if status:
        if status not in STATUSES:
            return validation_error({"status": "Unknown registration status."})
        query = query.filter(EventRegistration.status == status)
    return jsonify(
        {
            "event": _serialize_event_queue(post),
            "items": [serialize_registration(item, post, private=True) for item in query.all()],
        }
    )


@api_bp.patch("/admin/event-registrations/<int:registration_id>")
@require_capability("event_registrations")
def api_admin_event_registration_update(registration_id):
    item = db.session.get(EventRegistration, registration_id)
    if item is None:
        return api_error("not_found", "Registration not found.", status=404)
    post = Post.query.filter_by(id=item.post_id).with_for_update().first()
    body = get_json_body()
    target = (body.get("status") or "").strip()
    if target not in STATUSES:
        return validation_error({"status": "Unknown registration status."})

    previous = item.status
    if target in EVENT_REGISTRATION_CAPACITY_STATUSES and previous not in EVENT_REGISTRATION_CAPACITY_STATUSES:
        if not post.has_registration_space:
            return api_error("capacity_reached", "No place is available for this status.", status=409)
    item.status = target
    promoted = []
    if previous in EVENT_REGISTRATION_CAPACITY_STATUSES and target not in EVENT_REGISTRATION_CAPACITY_STATUSES:
        promoted = promote_waiting_list_for_post(post)
    db.session.commit()
    return jsonify(
        {
            "item": serialize_registration(item, post, private=True),
            "promoted": [serialize_registration(entry, post, private=True) for entry in promoted],
            "event": _serialize_event_queue(post),
        }
    )


@api_bp.get("/admin/events/<int:post_id>/registrations.csv")
@require_capability("event_registrations")
def api_admin_event_registrations_export(post_id):
    post = db.session.get(Post, post_id)
    if post is None:
        return api_error("not_found", "Event not found.", status=404)
    rows = ["application_id,name,email,occupation,status"]
    for item in search_event_registrations("", post_id=post.id).all():
        values = [item.public_id, item.full_name, item.email, item.occupation, item.status]
        rows.append(",".join(f'"{value.replace(chr(34), chr(34) * 2)}"' for value in values))
    return Response(
        "\n".join(rows) + "\n",
        mimetype="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{post.slug}-registrations.csv"'},
    )
