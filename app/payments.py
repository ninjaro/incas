"""Provider-agnostic payment layer with a working stub mode.

The Flask backend owns amounts and payment state; the frontend only starts a
checkout and renders statuses. Without provider credentials the mock provider
creates simulated checkout sessions with deterministic success/failure paths
that update the same models a real provider would.

Environment variables:
    PAYMENT_PROVIDER      - "stripe" (future real adapter) or "mock" (default)
    STRIPE_SECRET_KEY     - required for a real Stripe adapter
"""

import os
import secrets
from abc import ABC, abstractmethod

from flask import current_app

from app.datetime_utils import serialize_utc, utc_now
from app.models import (
    EVENT_REGISTRATION_STATUS_APPROVED,
    EVENT_REGISTRATION_STATUS_CANCELLED,
    EVENT_REGISTRATION_STATUS_WAITING_PAYMENT,
    PAYMENT_STATUS_CANCELLED,
    PAYMENT_STATUS_FAILED,
    PAYMENT_STATUS_PAID,
    PAYMENT_STATUS_PENDING,
    EventRegistration,
    PaymentStatusAudit,
    PaymentTransaction,
    Post,
    db,
)


class PaymentProvider(ABC):
    name = ""

    @abstractmethod
    def create_checkout_session(self, transaction) -> dict: ...

    @abstractmethod
    def resume_checkout_session(self, transaction) -> dict: ...

    @abstractmethod
    def handle_webhook(self, payload) -> PaymentTransaction | None: ...


class MockPaymentProvider(PaymentProvider):
    name = "mock"

    def create_checkout_session(self, transaction) -> dict:
        transaction.provider = self.name
        if not transaction.provider_session_id:
            transaction.provider_session_id = f"mock_cs_{transaction.public_id}"
        transaction.is_simulated = True
        return self.resume_checkout_session(transaction)

    def resume_checkout_session(self, transaction) -> dict:
        return {
            "checkoutUrl": f"/pay/simulated/{transaction.public_id}",
            "simulated": True,
        }

    def handle_webhook(self, payload) -> PaymentTransaction | None:
        public_id = (payload or {}).get("publicId", "")
        event = (payload or {}).get("event", "")
        transaction = PaymentTransaction.query.filter_by(public_id=public_id).first()
        if transaction is None or not transaction.is_simulated:
            return None
        previous_status = transaction.status
        if event == "checkout.completed":
            mark_paid(transaction)
        elif event == "checkout.failed" and transaction.status == PAYMENT_STATUS_PENDING:
            transaction.status = PAYMENT_STATUS_FAILED
            transaction.error_message = (payload or {}).get("message", "Simulated failure")
        record_payment_transition(
            transaction,
            previous_status,
            actor="provider:mock",
            note=f"Mock webhook: {event or 'unknown event'}",
        )
        return transaction


def get_payment_provider(provider_name=None) -> PaymentProvider:
    if provider_name is None:
        try:
            provider_name = current_app.config.get("PAYMENT_PROVIDER", "mock")
        except RuntimeError:
            provider_name = os.getenv("PAYMENT_PROVIDER", "mock")
    provider_name = (provider_name or "mock").strip().lower()
    if provider_name == "mock":
        return MockPaymentProvider()
    if provider_name == "stripe" and os.getenv("STRIPE_SECRET_KEY"):
        # Real Stripe adapter goes here behind the same interface.
        raise NotImplementedError("Stripe adapter not implemented yet; unset PAYMENT_PROVIDER to use mock mode.")
    raise RuntimeError(f"Unsupported payment provider mode: {provider_name}")


def new_payment_public_id():
    return f"PAY-{secrets.token_urlsafe(16)}"


def record_payment_transition(transaction, previous_status, *, actor, note=""):
    """Persist one audit row when a provider or application changes status."""
    if transaction.status == previous_status:
        return
    db.session.add(
        PaymentStatusAudit(
            payment_id=transaction.id,
            previous_status=previous_status,
            new_status=transaction.status,
            actor=actor,
            note=note,
        )
    )


def create_transaction(post, registration=None):
    """Create a pending transaction; the amount always comes from the post."""
    if post.has_registration_queue and registration is None:
        raise ValueError("Registration payments require a registration.")
    amount_cents = post.registration_price_cents or 0
    transaction = PaymentTransaction(
        public_id=new_payment_public_id(),
        post_id=post.id,
        registration_id=registration.id if registration is not None else None,
        amount_cents=amount_cents,
        status=PAYMENT_STATUS_PENDING,
        expires_at=registration.payment_expires_at if registration is not None else None,
    )
    db.session.add(transaction)
    return transaction


def mark_paid(transaction):
    """Confirm only the eligible registration linked to this transaction."""
    if transaction.status == PAYMENT_STATUS_PAID:
        return True
    if transaction.status != PAYMENT_STATUS_PENDING:
        return False
    if transaction.registration_id is None:
        transaction.status = PAYMENT_STATUS_FAILED
        transaction.error_message = "Payment is not linked to a registration."
        return False

    registration = db.session.get(EventRegistration, transaction.registration_id)
    if registration is None or registration.post_id != transaction.post_id:
        transaction.status = PAYMENT_STATUS_FAILED
        transaction.error_message = "Linked registration is invalid."
        return False
    if registration.status != EVENT_REGISTRATION_STATUS_WAITING_PAYMENT:
        transaction.status = PAYMENT_STATUS_FAILED
        transaction.error_message = "Registration is no longer eligible for payment."
        return False
    if registration.payment_expires_at and registration.payment_expires_at <= utc_now():
        from app.routes.helpers.event_registrations import promote_waiting_list_for_post

        transaction.status = PAYMENT_STATUS_CANCELLED
        transaction.error_message = "Payment reservation expired."
        registration.status = EVENT_REGISTRATION_STATUS_CANCELLED
        registration.payment_expires_at = None
        post = Post.query.filter_by(id=registration.post_id).with_for_update().first()
        if post is not None:
            promote_waiting_list_for_post(post)
        return False
    post = Post.query.filter_by(id=registration.post_id).with_for_update().first()
    if post is None or not post.has_registration_queue or not post.is_live:
        transaction.status = PAYMENT_STATUS_FAILED
        transaction.error_message = "Event registration is closed or no longer available."
        return False
    if post.registration_reserved_count > (post.registration_limit or 0):
        transaction.status = PAYMENT_STATUS_FAILED
        transaction.error_message = "Event capacity changed; contact the event team."
        return False

    transaction.status = PAYMENT_STATUS_PAID
    transaction.error_message = ""
    registration.status = EVENT_REGISTRATION_STATUS_APPROVED
    registration.payment_expires_at = None
    return True


def serialize_transaction(transaction):
    return {
        "publicId": transaction.public_id,
        "amountCents": transaction.amount_cents,
        "currency": transaction.currency,
        "status": transaction.status,
        "provider": transaction.provider,
        "isSimulated": bool(transaction.is_simulated),
        "errorMessage": transaction.error_message,
        "expiresAt": serialize_utc(transaction.expires_at),
        "createdAt": serialize_utc(transaction.created_at),
    }
