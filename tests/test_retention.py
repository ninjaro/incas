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
from app.retention import purge_expired_personal_data


def _old(days):
    return utc_now() - timedelta(days=days)


def test_purge_respects_lifecycle_anchors(app):
    with app.app_context():
        now = utc_now()

        keep_contact = ContactRequest(name="Keep", email="keep@example.org", message="x", created_at=_old(30))
        purge_contact_unresolved = ContactRequest(name="Old", email="old@example.org", message="x", created_at=_old(400))
        purge_contact_resolved = ContactRequest(
            name="Done", email="done@example.org", message="x",
            status="resolved", resolved_at=_old(200), created_at=_old(210),
        )
        keep_suggestion = EventSuggestion(kind="breakfast", contact_name="S", created_at=_old(10))
        db.session.add_all([keep_contact, purge_contact_unresolved, purge_contact_resolved, keep_suggestion])

        # Tandem: one recent (keep), one long past its departure date (purge)
        # with dependent review + duplicate rows that must go too.
        keep_tandem = LanguageTandemRequest(
            first_name="A", last_name="B", email="a@example.org", gender="Female",
            departure_date=(now + timedelta(days=30)).date(), country_of_origin="DE",
            created_at=_old(5),
        )
        stale_tandem = LanguageTandemRequest(
            first_name="C", last_name="D", email="c@example.org", gender="Male",
            departure_date=(now - timedelta(days=200)).date(), country_of_origin="ES",
            created_at=_old(210),
        )
        db.session.add_all([keep_tandem, stale_tandem])
        db.session.flush()
        db.session.add(TandemMatchReviewState(source_request_id=stale_tandem.id, candidate_request_id=keep_tandem.id))
        db.session.add(TandemDuplicateDecision(left_request_id=min(stale_tandem.id, keep_tandem.id), right_request_id=max(stale_tandem.id, keep_tandem.id), decision="different", note="looks different"))

        old_event = Post(slug="past-party", title="Past Party", summary="s", body="b", starts_at=_old(400), duration_minutes=120)
        soon_event = Post(slug="soon-party", title="Soon Party", summary="s", body="b", starts_at=now + timedelta(days=5), duration_minutes=120)
        db.session.add_all([old_event, soon_event])
        db.session.flush()

        purge_registration = EventRegistration(
            public_id="EVT-OLD-1", post_id=old_event.id, first_name="R", last_name="R",
            email="r@example.org", occupation="student", status="approved", created_at=_old(400),
        )
        keep_registration = EventRegistration(
            public_id="EVT-NEW-1", post_id=soon_event.id, first_name="K", last_name="K",
            email="k@example.org", occupation="student", status="approved", created_at=_old(1),
        )
        db.session.add_all([purge_registration, keep_registration])
        db.session.flush()
        payment = PaymentTransaction(public_id="PAY-OLD-1", registration_id=purge_registration.id, amount_cents=500, status="paid")
        db.session.add(payment)
        db.session.flush()
        db.session.add(PaymentStatusAudit(payment_id=payment.id, previous_status="pending", new_status="paid"))

        purge_karaoke = KaraokeSongRequest(
            public_id="KRQ-OLD-1", post_id=old_event.id, display_name="Old Singer", song_title="Song", created_at=_old(400),
        )
        keep_karaoke = KaraokeSongRequest(
            public_id="KRQ-NEW-1", post_id=soon_event.id, display_name="New Singer", song_title="Song", created_at=_old(1),
        )
        db.session.add_all([purge_karaoke, keep_karaoke])
        db.session.flush()
        db.session.add(KaraokeQueueAudit(request_id=purge_karaoke.id, action="submitted"))

        stale_attempt = AccessUnlockAttempt(source_hash="h" * 8, session_audit_id="s" * 8, succeeded=False, created_at=_old(120))
        fresh_attempt = AccessUnlockAttempt(source_hash="h" * 8, session_audit_id="s" * 8, succeeded=True, created_at=_old(10))
        db.session.add_all([stale_attempt, fresh_attempt])
        db.session.commit()

        stale_tandem_id = stale_tandem.id
        stale_registration_id = purge_registration.id
        stale_karaoke_id = purge_karaoke.id
        stale_attempt_id = stale_attempt.id

        counts = purge_expired_personal_data()
        db.session.commit()

        # Every category deleted at least the rows we planted for it.
        assert counts["contact_requests"] >= 2
        assert counts["language_tandem_requests"] >= 1
        assert counts["event_registrations"] >= 1
        assert counts["karaoke_song_requests"] >= 1
        assert counts["access_unlock_attempts"] >= 1

        # Stale rows and their dependents are gone.
        assert db.session.get(LanguageTandemRequest, stale_tandem_id) is None
        assert db.session.get(EventRegistration, stale_registration_id) is None
        assert db.session.get(KaraokeSongRequest, stale_karaoke_id) is None
        assert db.session.get(AccessUnlockAttempt, stale_attempt_id) is None
        assert TandemMatchReviewState.query.filter(
            (TandemMatchReviewState.source_request_id == stale_tandem_id)
            | (TandemMatchReviewState.candidate_request_id == stale_tandem_id)
        ).count() == 0
        assert TandemDuplicateDecision.query.filter(
            (TandemDuplicateDecision.left_request_id == stale_tandem_id)
            | (TandemDuplicateDecision.right_request_id == stale_tandem_id)
        ).count() == 0
        assert PaymentTransaction.query.filter_by(public_id="PAY-OLD-1").count() == 0
        assert PaymentStatusAudit.query.count() == 0
        assert KaraokeQueueAudit.query.filter_by(request_id=stale_karaoke_id).count() == 0

        # Fresh rows survive.
        assert ContactRequest.query.filter_by(email="keep@example.org").count() == 1
        assert LanguageTandemRequest.query.filter_by(email="a@example.org").count() == 1
        assert EventRegistration.query.filter_by(public_id="EVT-NEW-1").count() == 1
        assert KaraokeSongRequest.query.filter_by(public_id="KRQ-NEW-1").count() == 1
        assert db.session.get(AccessUnlockAttempt, fresh_attempt.id) is not None
        assert EventSuggestion.query.filter_by(contact_name="S").count() == 1

        # Idempotent: a second run deletes nothing.
        again = purge_expired_personal_data()
        assert all(value == 0 for value in again.values())


def test_purge_cli_command_runs(app):
    runner = app.test_cli_runner()
    result = runner.invoke(args=["purge-personal-data"])
    assert result.exit_code == 0, result.output
    assert "contact_requests=" in result.output
