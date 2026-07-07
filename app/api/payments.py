from flask import jsonify

from app.api import api_bp, api_error, get_json_body, validation_error
from app.models import (
    PAYMENT_STATUS_CANCELLED,
    PAYMENT_STATUS_FAILED,
    PAYMENT_STATUS_PENDING,
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

    registration = None
    registration_public_id = (body.get("registrationPublicId") or "").strip()
    if registration_public_id:
        registration = EventRegistration.query.filter_by(public_id=registration_public_id).first()
        if registration is None or registration.post_id != item.id:
            return validation_error({"registrationPublicId": "Unknown registration."})

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
