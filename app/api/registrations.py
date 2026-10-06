import csv
import io
import re
import threading
from contextlib import nullcontext

from flask import Response, current_app, jsonify, request

from app.api import api_bp, api_error, get_json_body, rate_limited, require_capability, validation_error
from app.datetime_utils import serialize_utc
from app.models import (
    EVENT_REGISTRATION_CAPACITY_STATUSES,
    EVENT_REGISTRATION_STATUS_APPROVED,
    EVENT_REGISTRATION_STATUS_CANCELLED,
    EVENT_REGISTRATION_STATUS_LABELS,
    EVENT_REGISTRATION_STATUS_WAITING_LIST,
    EVENT_REGISTRATION_STATUS_WAITING_PAYMENT,
    EVENT_REGISTRATION_STATUS_WAITING_REFUND,
    EventRegistration,
    PaymentStatusAudit,
    PaymentTransaction,
    Post,
    db,
)
from app.payments import get_payment_provider, serialize_transaction
from app.registration_recovery import get_registration_recovery_mailer
from app.routes.helpers.event_registrations import (
    assign_payment_deadline,
    allowed_registration_transitions,
    apply_registration_transition,
    build_event_registration_public_id,
    determine_initial_registration_status,
    expire_waiting_payment_registrations,
    get_waiting_list_position,
    latest_registration_payment,
    promote_waiting_list_for_post,
    search_event_registrations,
    should_collect_diet_preference,
)
from app.routes.helpers.access import get_session_audit_id, has_capability


def _registration_admin_tier():
    if has_capability("event_registrations_private"):
        return "private"
    if has_capability("event_registrations_checkin"):
        return "checkin"
    return "view"


EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
STATUSES = {
    EVENT_REGISTRATION_STATUS_APPROVED,
    EVENT_REGISTRATION_STATUS_CANCELLED,
    EVENT_REGISTRATION_STATUS_WAITING_PAYMENT,
    EVENT_REGISTRATION_STATUS_WAITING_LIST,
    EVENT_REGISTRATION_STATUS_WAITING_REFUND,
}
_sqlite_registration_locks = {}
_sqlite_registration_locks_guard = threading.Lock()


def _registration_creation_lock(slug):
    database_uri = current_app.config.get("SQLALCHEMY_DATABASE_URI", "")
    if not database_uri.startswith("sqlite"):
        return nullcontext()
    with _sqlite_registration_locks_guard:
        return _sqlite_registration_locks.setdefault(slug, threading.Lock())


def _payment_for_registration(item):
    payment = (
        PaymentTransaction.query
        .filter_by(registration_id=item.id)
        .order_by(PaymentTransaction.created_at.desc())
        .first()
    )
    if payment is None:
        return None
    payload = serialize_transaction(payment)
    if payment.status == "pending":
        payload.update(get_payment_provider(payment.provider).resume_checkout_session(payment))
    return payload


def serialize_registration(item, post=None, *, tier="public"):
    # tier: "public" (participant's own bearer link) | "view" (capacity
    # monitoring, no identity) | "checkin" (door check-in: name + transitions,
    # no contact/free-text) | "private" (full participant data).
    post = post or db.session.get(Post, item.post_id)
    identified = tier in ("public", "checkin", "private")
    admin = tier in ("checkin", "private")
    payload = {
        "publicId": item.public_id,
        "status": item.status,
        "statusLabel": EVENT_REGISTRATION_STATUS_LABELS.get(item.status, item.status_label),
        "waitingListPosition": get_waiting_list_position(item),
        "event": {
            "slug": post.slug,
            "title": post.display_title,
            "startsAt": serialize_utc(post.starts_at),
            "capacity": post.registration_limit,
            "placesRemaining": post.registration_places_remaining,
            "priceCents": post.registration_price_cents,
            "isDeposit": bool(post.registration_is_deposit),
        },
        "payment": _payment_for_registration(item),
        "paymentExpiresAt": serialize_utc(item.payment_expires_at),
        "trackingPath": f"/registrations/{item.public_id}",
        "createdAt": serialize_utc(item.created_at),
        "updatedAt": serialize_utc(item.updated_at),
    }
    if identified:
        payload["name"] = item.full_name
    if admin:
        payload["id"] = item.id
        payload["allowedTransitions"] = allowed_registration_transitions(item, post)
    if tier == "private":
        payload.update(
            {
                "firstName": item.first_name,
                "lastName": item.last_name,
                "email": item.email,
                "occupation": item.occupation,
                "dietPreference": item.diet_preference,
                "comment": item.comment,
            }
        )
    return payload


@api_bp.post("/public/events/<slug>/registrations")
@rate_limited("registration.create", limit=20)
def api_public_event_registration_create(slug):
    with _registration_creation_lock(slug):
        return _create_public_event_registration(slug)


def _create_public_event_registration(slug):
    post = Post.query.filter_by(slug=slug).with_for_update().first()
    if post is None or not post.is_publicly_accessible:
        return api_error("not_found", "Event not found.", status=404)
    if not post.has_registration_queue:
        return api_error("registration_unavailable", "This event has no registration queue.", status=422)
    if not post.is_live:
        return api_error("registration_closed", "Registration is closed.", status=409)

    expired, _promoted = expire_waiting_payment_registrations(post_id=post.id)
    if expired:
        db.session.flush()

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
            "registration_conflict",
            "A new registration cannot be created with these details. You can request the existing link by email.",
            status=409,
        )

    initial_status = determine_initial_registration_status(post)
    item = EventRegistration(
        public_id=build_event_registration_public_id(),
        post_id=post.id,
        first_name=values["firstName"][:120],
        last_name=values["lastName"][:120],
        email=values["email"][:255],
        occupation=values["occupation"][:120],
        diet_preference=values["dietPreference"],
        comment=values["comment"][:10000],
        status=initial_status,
    )
    assign_payment_deadline(item, post)
    db.session.add(item)
    db.session.commit()
    return jsonify(serialize_registration(item, post)), 201


@api_bp.get("/public/registrations/<public_id>")
@rate_limited("registration.track", limit=60)
def api_public_registration_status(public_id):
    item = EventRegistration.query.filter_by(public_id=public_id).first()
    if item is None:
        return api_error("not_found", "Registration not found.", status=404)
    expired, _promoted = expire_waiting_payment_registrations(post_id=item.post_id)
    if expired:
        db.session.commit()
        item = EventRegistration.query.filter_by(public_id=public_id).first()
    return jsonify(serialize_registration(item))


@api_bp.post("/public/registrations/recover")
@rate_limited("registration.recover", limit=5)
def api_public_registration_recover():
    body = get_json_body()
    slug = (body.get("eventSlug") or "").strip()
    email = (body.get("email") or "").strip().lower()
    if not slug or not EMAIL_RE.match(email):
        return validation_error(
            {
                **({"eventSlug": "Select an event."} if not slug else {}),
                **({"email": "Enter a valid email address."} if not EMAIL_RE.match(email) else {}),
            }
        )

    post = Post.query.filter_by(slug=slug).first()
    registration = None
    if post is not None:
        registration = (
            EventRegistration.query
            .filter_by(post_id=post.id, email=email)
            .filter(EventRegistration.status != EVENT_REGISTRATION_STATUS_CANCELLED)
            .first()
        )
    if registration is not None:
        tracking_url = (
            f"{request.url_root.rstrip('/')}/registrations/{registration.public_id}"
        )
        try:
            get_registration_recovery_mailer().send_tracking_link(
                registration.email,
                post.display_title,
                tracking_url,
            )
        except Exception:
            current_app.logger.exception("Registration recovery delivery failed.")

    return (
        jsonify(
            {
                "accepted": True,
                "message": "If a matching active registration exists, its private link will be sent to that email address.",
            }
        ),
        202,
    )


def _serialize_event_queue(post):
    return {
        "postId": post.id,
        "slug": post.slug,
        "title": post.display_title,
        "startsAt": serialize_utc(post.starts_at),
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
@require_capability("event_registrations_view")
def api_admin_event_registration_queues():
    expired, _promoted = expire_waiting_payment_registrations()
    if expired:
        db.session.commit()
    posts = (
        Post.query
        .filter(Post.registration_limit_enabled.is_(True))
        .order_by(Post.starts_at.desc())
        .all()
    )
    return jsonify({"events": [_serialize_event_queue(post) for post in posts]})


@api_bp.get("/admin/events/<int:post_id>/registrations")
@require_capability("event_registrations_view")
def api_admin_event_registrations(post_id):
    post = db.session.get(Post, post_id)
    if post is None or not post.has_registration_queue:
        return api_error("not_found", "Event queue not found.", status=404)
    expired, _promoted = expire_waiting_payment_registrations(post_id=post.id)
    if expired:
        db.session.commit()
    query = search_event_registrations(request.args.get("q", ""), post_id=post.id)
    status = request.args.get("status", "").strip()
    if status:
        if status not in STATUSES:
            return validation_error({"status": "Unknown registration status."})
        query = query.filter(EventRegistration.status == status)
    tier = _registration_admin_tier()
    return jsonify(
        {
            "event": _serialize_event_queue(post),
            "items": [serialize_registration(item, post, tier=tier) for item in query.all()],
            "tier": tier,
        }
    )


@api_bp.patch("/admin/event-registrations/<int:registration_id>")
@require_capability("event_registrations_checkin")
def api_admin_event_registration_update(registration_id):
    item = db.session.get(EventRegistration, registration_id)
    if item is None:
        return api_error("not_found", "Registration not found.", status=404)
    post = Post.query.filter_by(id=item.post_id).with_for_update().first()
    expired, _promoted = expire_waiting_payment_registrations(post_id=post.id)
    if expired:
        db.session.flush()
    body = get_json_body()
    target = (body.get("status") or "").strip()
    if target not in STATUSES:
        return validation_error({"status": "Unknown registration status."})

    if target in EVENT_REGISTRATION_CAPACITY_STATUSES and not post.has_registration_space:
        return api_error("capacity_reached", "No place is available for this status.", status=409)
    payment = latest_registration_payment(item)
    previous_payment_status = payment.status if payment is not None else None
    try:
        promoted = apply_registration_transition(item, post, target)
    except ValueError:
        return api_error(
            "invalid_transition",
            "This registration status change is not allowed.",
            status=409,
            details={"allowedTransitions": allowed_registration_transitions(item, post)},
        )
    if payment is not None and payment.status != previous_payment_status:
        db.session.add(
            PaymentStatusAudit(
                payment_id=payment.id,
                previous_status=previous_payment_status,
                new_status=payment.status,
                actor=get_session_audit_id(),
                note="Changed through registration queue.",
            )
        )
    db.session.commit()
    tier = _registration_admin_tier()
    return jsonify(
        {
            "item": serialize_registration(item, post, tier=tier),
            "promoted": [serialize_registration(entry, post, tier=tier) for entry in promoted],
            "event": _serialize_event_queue(post),
        }
    )


@api_bp.get("/admin/events/<int:post_id>/registrations.csv")
@require_capability("event_registrations_export")
def api_admin_event_registrations_export(post_id):
    post = db.session.get(Post, post_id)
    if post is None:
        return api_error("not_found", "Event not found.", status=404)
    output = io.StringIO(newline="")
    writer = csv.writer(output, quoting=csv.QUOTE_ALL, lineterminator="\n")
    writer.writerow(
        ["application_id", "name", "email", "occupation", "diet_preference", "comment", "status"]
    )
    for item in search_event_registrations("", post_id=post.id).all():
        values = [
            item.public_id,
            item.full_name,
            item.email,
            item.occupation,
            item.diet_preference,
            item.comment,
            item.status,
        ]
        writer.writerow([_safe_csv_cell(value) for value in values])
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{post.slug}-registrations.csv"',
            "Cache-Control": "no-store",
        },
    )


def _safe_csv_cell(value):
    text = str(value or "")
    if text.startswith(("=", "+", "-", "@", "\t", "\r", "\n")):
        return f"'{text}"
    return text
