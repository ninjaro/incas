from flask import jsonify, request

from app.api import api_bp, api_error, get_json_body, require_capability, validation_error
from app.models import (
    PAYMENT_STATUS_CANCELLED,
    PAYMENT_STATUS_FAILED,
    PAYMENT_STATUS_PENDING,
    PAYMENT_STATUS_PAID,
    PAYMENT_STATUS_REFUND_PENDING,
    PAYMENT_STATUS_REFUNDED,
    EVENT_REGISTRATION_STATUS_CANCELLED,
    EVENT_REGISTRATION_STATUS_WAITING_REFUND,
    EVENT_REGISTRATION_STATUS_WAITING_PAYMENT,
    EventRegistration,
    PaymentTransaction,
    Post,
    db,
)
from app.payments import (
    create_transaction,
    get_payment_provider,
    mark_paid,
    serialize_transaction,
)
from app.routes.helpers.event_registrations import promote_waiting_list_for_post


@api_bp.post("/payments/checkout")
def api_payments_checkout():
    body = get_json_body()
    slug = (body.get("postSlug") or "").strip()
    item = Post.query.filter_by(slug=slug).first()
    if item is None or not item.is_publicly_accessible:
        return api_error("not_found", "Event not found.", status=404)
    # The price always comes from the post on the server; any client-supplied
    # amount is ignored, which prevents price manipulation.
    if not item.registration_price_cents:
        return api_error("payment_not_required", "This event does not require payment.", status=422)

    registration_public_id = (body.get("registrationPublicId") or "").strip()
    if not registration_public_id:
        return validation_error(
            {"registrationPublicId": "Create an event registration before starting payment."}
        )
    registration = EventRegistration.query.filter_by(public_id=registration_public_id).first()
    if registration is None or registration.post_id != item.id:
        return validation_error({"registrationPublicId": "Unknown registration."})
    if registration.status != EVENT_REGISTRATION_STATUS_WAITING_PAYMENT:
        return api_error(
            "registration_not_payable",
            "This registration is not waiting for payment.",
            status=409,
        )
    existing = (
        PaymentTransaction.query
        .filter_by(registration_id=registration.id)
        .filter(PaymentTransaction.status.in_([PAYMENT_STATUS_PENDING, PAYMENT_STATUS_PAID]))
        .first()
    )
    if existing is not None:
        return api_error(
            "payment_exists",
            "This registration already has an active payment.",
            status=409,
            details={"publicId": existing.public_id},
        )

    transaction = create_transaction(item, registration)
    session_info = get_payment_provider().create_checkout_session(transaction)
    db.session.commit()

    payload = serialize_transaction(transaction)
    payload.update(session_info)
    return jsonify(payload), 201


@api_bp.get("/payments/<public_id>")
def api_payments_status(public_id):
    transaction = PaymentTransaction.query.filter_by(public_id=public_id).first()
    if transaction is None:
        return api_error("not_found", "Payment not found.", status=404)
    return jsonify(serialize_transaction(transaction))


@api_bp.post("/payments/<public_id>/simulate")
def api_payments_simulate(public_id):
    """Deterministic success/failure/cancel paths for the stub provider."""
    transaction = PaymentTransaction.query.filter_by(public_id=public_id).first()
    if transaction is None:
        return api_error("not_found", "Payment not found.", status=404)
    if not transaction.is_simulated:
        return api_error("not_simulated", "This payment is not a simulated transaction.", status=409)
    if transaction.status != PAYMENT_STATUS_PENDING:
        return api_error("payment_finalized", "This payment is already finalized.", status=409)

    outcome = (get_json_body().get("outcome") or "success").strip()
    if outcome == "success":
        mark_paid(transaction)
    elif outcome == "failure":
        transaction.status = PAYMENT_STATUS_FAILED
        transaction.error_message = "Simulated payment failure"
    elif outcome == "cancel":
        transaction.status = PAYMENT_STATUS_CANCELLED
    else:
        return validation_error({"outcome": "Use success, failure, or cancel."})

    db.session.commit()
    return jsonify(serialize_transaction(transaction))


@api_bp.post("/payments/webhook")
def api_payments_webhook():
    transaction = get_payment_provider().handle_webhook(get_json_body())
    if transaction is None:
        return api_error("webhook_ignored", "Webhook did not match a known payment.", status=400)
    db.session.commit()
    return jsonify(serialize_transaction(transaction))


def serialize_admin_payment(transaction):
    payload = serialize_transaction(transaction)
    post = db.session.get(Post, transaction.post_id) if transaction.post_id else None
    registration = db.session.get(EventRegistration, transaction.registration_id) if transaction.registration_id else None
    payload.update(
        {
            "id": transaction.id,
            "eventTitle": post.display_title if post else "",
            "eventSlug": post.slug if post else "",
            "registrationPublicId": registration.public_id if registration else None,
            "registrationName": registration.full_name if registration else None,
        }
    )
    return payload


@api_bp.get("/admin/payments")
@require_capability("event_registrations")
def api_admin_payments():
    query = PaymentTransaction.query
    status = request.args.get("status", "").strip()
    if status:
        query = query.filter(PaymentTransaction.status == status)
    items = query.order_by(PaymentTransaction.created_at.desc()).limit(500).all()
    return jsonify({"items": [serialize_admin_payment(item) for item in items]})


@api_bp.patch("/admin/payments/<int:payment_id>")
@require_capability("event_registrations")
def api_admin_payment_update(payment_id):
    transaction = db.session.get(PaymentTransaction, payment_id)
    if transaction is None:
        return api_error("not_found", "Payment not found.", status=404)
    status = (get_json_body().get("status") or "").strip()
    if status not in {PAYMENT_STATUS_REFUND_PENDING, PAYMENT_STATUS_REFUNDED, PAYMENT_STATUS_CANCELLED}:
        return validation_error({"status": "Use refund_pending, refunded, or cancelled."})
    if status in {PAYMENT_STATUS_REFUND_PENDING, PAYMENT_STATUS_REFUNDED} and transaction.status not in {
        PAYMENT_STATUS_PAID,
        PAYMENT_STATUS_REFUND_PENDING,
    }:
        return api_error("invalid_transition", "Only a paid payment can be refunded.", status=409)
    transaction.status = status
    registration = db.session.get(EventRegistration, transaction.registration_id) if transaction.registration_id else None
    if registration is not None:
        registration.status = (
            EVENT_REGISTRATION_STATUS_WAITING_REFUND
            if status == PAYMENT_STATUS_REFUND_PENDING
            else EVENT_REGISTRATION_STATUS_CANCELLED
        )
        if status in {PAYMENT_STATUS_REFUNDED, PAYMENT_STATUS_CANCELLED}:
            post = db.session.get(Post, registration.post_id)
            if post is not None:
                promote_waiting_list_for_post(post)
    db.session.commit()
    return jsonify(serialize_admin_payment(transaction))
