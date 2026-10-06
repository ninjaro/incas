"""Lifecycle-based retention for personal data.

Every record that holds personal data has a defined deletion rule anchored to
the event that ends its purpose (a request being resolved, an event finishing, a
tandem pair being finalised). ``purge_expired_personal_data`` applies those rules
and also removes the dependent rows (audit trails, match/duplicate state,
payment records) so no personal data survives in a related table after the main
record is gone.

The caller owns the transaction. The ``retention-worker`` / ``purge-personal-data``
CLI commands in ``app/__init__.py`` run this on a schedule.
"""

from datetime import timedelta

from app.datetime_utils import utc_now
from app.models import (
    AccessUnlockAttempt,
    ContactRequest,
    EventRegistration,
    EventSuggestion,
    KaraokeQueueAudit,
    KaraokeSongRequest,
    LanguageTandemRequest,
    PaymentStatusAudit,
    PaymentTransaction,
    Post,
    TandemDuplicateDecision,
    TandemMatchReviewState,
    db,
)

# Retention windows (days). Anchored to the end of the processing purpose.
RETENTION_DAYS = {
    "contact_resolved": 180,
    "contact_unresolved": 365,
    "suggestion_resolved": 180,
    "suggestion_unresolved": 365,
    "tandem_final_pair": 90,
    "tandem_departure": 90,
    "tandem_unmatched": 365,
    "event_registration_after_end": 180,
    "karaoke_after_end": 30,
    "access_attempt": 90,
}


def _days_ago(days, now):
    return now - timedelta(days=days)


def _purge_form_requests(model, now, resolved_days, unresolved_days):
    resolved_cutoff = _days_ago(resolved_days, now)
    unresolved_cutoff = _days_ago(unresolved_days, now)
    stale = (
        model.query
        .filter(
            db.or_(
                db.and_(model.resolved_at.isnot(None), model.resolved_at < resolved_cutoff),
                db.and_(model.resolved_at.is_(None), model.created_at < unresolved_cutoff),
            )
        )
        .all()
    )
    for item in stale:
        db.session.delete(item)
    return len(stale)


def _purge_tandem_requests(now):
    final_pair_cutoff = _days_ago(RETENTION_DAYS["tandem_final_pair"], now)
    departure_cutoff = _days_ago(RETENTION_DAYS["tandem_departure"], now).date()
    created_cutoff = _days_ago(RETENTION_DAYS["tandem_unmatched"], now)

    # Latest finalised-pair timestamp per request (either side of the pair).
    final_pair_at_by_request = {}
    for state in TandemMatchReviewState.query.filter(
        TandemMatchReviewState.final_pair_at.isnot(None)
    ).all():
        for request_id in (state.source_request_id, state.candidate_request_id):
            current = final_pair_at_by_request.get(request_id)
            if current is None or state.final_pair_at > current:
                final_pair_at_by_request[request_id] = state.final_pair_at

    purged = 0
    for item in LanguageTandemRequest.query.all():
        final_pair_at = final_pair_at_by_request.get(item.id)
        if final_pair_at is not None:
            expired = final_pair_at < final_pair_cutoff
        elif item.departure_date is not None:
            expired = item.departure_date < departure_cutoff
        else:
            expired = item.created_at < created_cutoff
        if not expired:
            continue

        TandemMatchReviewState.query.filter(
            db.or_(
                TandemMatchReviewState.source_request_id == item.id,
                TandemMatchReviewState.candidate_request_id == item.id,
            )
        ).delete(synchronize_session=False)
        TandemDuplicateDecision.query.filter(
            db.or_(
                TandemDuplicateDecision.left_request_id == item.id,
                TandemDuplicateDecision.right_request_id == item.id,
            )
        ).delete(synchronize_session=False)
        db.session.delete(item)
        purged += 1
    return purged


def _purge_event_registrations(now):
    cutoff = _days_ago(RETENTION_DAYS["event_registration_after_end"], now)
    # Only past events can qualify; prefilter on the (indexed) start column.
    candidates = (
        EventRegistration.query
        .join(Post, Post.id == EventRegistration.post_id)
        .filter(Post.starts_at.isnot(None))
        .filter(Post.starts_at < cutoff)
        .all()
    )
    purged = 0
    for item in candidates:
        post = db.session.get(Post, item.post_id)
        ends_at = post.ends_at if post is not None else None
        if ends_at is None or ends_at >= cutoff:
            continue
        payment_ids = [
            row.id
            for row in PaymentTransaction.query
            .filter(PaymentTransaction.registration_id == item.id)
            .all()
        ]
        if payment_ids:
            PaymentStatusAudit.query.filter(
                PaymentStatusAudit.payment_id.in_(payment_ids)
            ).delete(synchronize_session=False)
            PaymentTransaction.query.filter(
                PaymentTransaction.id.in_(payment_ids)
            ).delete(synchronize_session=False)
        db.session.delete(item)
        purged += 1
    return purged


def _purge_karaoke_requests(now):
    cutoff = _days_ago(RETENTION_DAYS["karaoke_after_end"], now)
    purged = 0
    for item in KaraokeSongRequest.query.all():
        post = db.session.get(Post, item.post_id) if item.post_id else None
        anchor = None
        if post is not None:
            anchor = post.ends_at
        if anchor is None:
            anchor = item.created_at
        if anchor is None or anchor >= cutoff:
            continue
        KaraokeQueueAudit.query.filter(
            KaraokeQueueAudit.request_id == item.id
        ).delete(synchronize_session=False)
        db.session.delete(item)
        purged += 1
    return purged


def _purge_access_attempts(now):
    cutoff = _days_ago(RETENTION_DAYS["access_attempt"], now)
    return (
        AccessUnlockAttempt.query
        .filter(AccessUnlockAttempt.created_at < cutoff)
        .delete(synchronize_session=False)
    )


def purge_expired_personal_data(now=None):
    """Delete personal data past its retention window. Caller commits."""
    now = now or utc_now()
    counts = {
        "contact_requests": _purge_form_requests(
            ContactRequest,
            now,
            RETENTION_DAYS["contact_resolved"],
            RETENTION_DAYS["contact_unresolved"],
        ),
        "event_suggestions": _purge_form_requests(
            EventSuggestion,
            now,
            RETENTION_DAYS["suggestion_resolved"],
            RETENTION_DAYS["suggestion_unresolved"],
        ),
        "language_tandem_requests": _purge_tandem_requests(now),
        "event_registrations": _purge_event_registrations(now),
        "karaoke_song_requests": _purge_karaoke_requests(now),
        "access_unlock_attempts": _purge_access_attempts(now),
    }
    return counts
