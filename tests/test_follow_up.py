from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import event as sqlalchemy_event

from app.datetime_utils import parse_iso_to_utc, serialize_utc, utc_now
from app.models import (
    AccessKey,
    AccessUnlockAttempt,
    EventRegistration,
    KaraokeSongRequest,
    PaymentStatusAudit,
    PaymentTransaction,
    Post,
    PostSlugRedirect,
    db,
)
from tests.conftest import API_HEADERS, unlock


def create_registration_event(app, slug, *, capacity=2, price_cents=None):
    with app.app_context():
        item = Post(
            slug=slug,
            title=slug.replace("-", " ").title(),
            starts_at=utc_now() + timedelta(days=7),
            status="published",
            is_active=True,
            registration_limit_enabled=True,
            registration_limit=capacity,
            registration_price_cents=price_cents,
            registration_mode="queue",
        )
        db.session.add(item)
        db.session.commit()
        return item.id


def register(client, slug, email, *, index=1):
    return client.post(
        f"/api/v1/public/events/{slug}/registrations",
        json={
            "firstName": f"Person {index}",
            "lastName": "Example",
            "email": email,
            "occupation": "student",
            "comment": "",
        },
        headers=API_HEADERS,
    )


def test_duplicate_registration_does_not_disclose_tracking_or_payment_ids(
    client, app, monkeypatch
):
    create_registration_event(app, "private-registration")
    created = register(client, "private-registration", "private@example.org")
    assert created.status_code == 201
    public_id = created.get_json()["publicId"]

    duplicate = register(client, "private-registration", "private@example.org", index=2)
    assert duplicate.status_code == 409
    payload = duplicate.get_json()
    assert payload["error"]["code"] == "registration_conflict"
    assert public_id not in str(payload)
    assert "payment" not in str(payload).lower()

    delivered = []

    class FakeMailer:
        def send_tracking_link(self, email, event_title, tracking_url):
            delivered.append((email, event_title, tracking_url))
            return True

    monkeypatch.setattr(
        "app.api.registrations.get_registration_recovery_mailer",
        lambda: FakeMailer(),
    )
    recovered = client.post(
        "/api/v1/public/registrations/recover",
        json={"eventSlug": "private-registration", "email": "private@example.org"},
        headers=API_HEADERS,
    )
    unknown = client.post(
        "/api/v1/public/registrations/recover",
        json={"eventSlug": "private-registration", "email": "unknown@example.org"},
        headers=API_HEADERS,
    )
    assert recovered.status_code == unknown.status_code == 202
    assert recovered.get_json() == unknown.get_json()
    assert public_id not in str(recovered.get_json())
    assert delivered == [
        (
            "private@example.org",
            "Private Registration",
            f"http://localhost/registrations/{public_id}",
        )
    ]


def test_generated_access_key_uses_fragment_and_legacy_form_cannot_bypass_api(
    client, app
):
    unlock(client, app, "access-root", ["access_keys"])
    created = client.post(
        "/api/v1/admin/access-keys",
        json={
            "label": "Forms",
            "scopes": ["forms"],
            "expiresAt": serialize_utc(utc_now() + timedelta(days=1)),
        },
        headers=API_HEADERS,
    ).get_json()
    assert created["unlockFragment"] == f"#access-key={created['secret']}"
    assert "/admin/unlock/" not in str(created)

    legacy_client = app.test_client()
    legacy = legacy_client.post("/admin", data={"phrase": created["secret"]})
    assert legacy.status_code == 303
    assert legacy_client.get("/api/v1/session").get_json()["capabilities"] == []


def test_expired_payment_reservation_promotes_waiting_list_idempotently(client, app):
    create_registration_event(app, "expiry-event", capacity=1, price_cents=200)
    first = register(client, "expiry-event", "first@example.org", index=1).get_json()
    second = register(client, "expiry-event", "second@example.org", index=2).get_json()
    assert first["status"] == "waiting_payment"
    assert second["status"] == "waiting_list"

    checkout = client.post(
        "/api/v1/payments/checkout",
        json={
            "postSlug": "expiry-event",
            "registrationPublicId": first["publicId"],
        },
        headers=API_HEADERS,
    ).get_json()
    with app.app_context():
        registration = EventRegistration.query.filter_by(public_id=first["publicId"]).one()
        registration.payment_expires_at = utc_now() - timedelta(seconds=1)
        transaction = PaymentTransaction.query.filter_by(public_id=checkout["publicId"]).one()
        transaction.expires_at = registration.payment_expires_at
        db.session.commit()

    runner = app.test_cli_runner()
    first_run = runner.invoke(args=["reservation-worker", "--once"])
    second_run = runner.invoke(args=["reservation-worker", "--once"])
    assert first_run.exit_code == 0
    assert "expired=1 promoted=1" in first_run.output
    assert "expired=0 promoted=0" in second_run.output

    with app.app_context():
        expired = EventRegistration.query.filter_by(public_id=first["publicId"]).one()
        promoted = EventRegistration.query.filter_by(public_id=second["publicId"]).one()
        payment = PaymentTransaction.query.filter_by(public_id=checkout["publicId"]).one()
        assert expired.status == "cancelled"
        assert expired.payment_expires_at is None
        assert promoted.status == "waiting_payment"
        assert promoted.payment_expires_at > utc_now()
        assert payment.status == "cancelled"


def test_active_checkout_is_resumed_and_webhook_is_idempotently_audited(client, app):
    create_registration_event(app, "resumable-payment", capacity=1, price_cents=500)
    registration = register(
        client, "resumable-payment", "resume@example.org"
    ).get_json()
    checkout_request = {
        "postSlug": "resumable-payment",
        "registrationPublicId": registration["publicId"],
    }
    first = client.post(
        "/api/v1/payments/checkout",
        json=checkout_request,
        headers=API_HEADERS,
    )
    second = client.post(
        "/api/v1/payments/checkout",
        json=checkout_request,
        headers=API_HEADERS,
    )
    assert first.status_code == 201
    assert second.status_code == 200
    assert second.get_json()["publicId"] == first.get_json()["publicId"]
    assert second.get_json()["checkoutUrl"] == first.get_json()["checkoutUrl"]

    status = client.get(
        f"/api/v1/public/registrations/{registration['publicId']}"
    ).get_json()
    assert status["payment"]["publicId"] == first.get_json()["publicId"]
    assert status["payment"]["status"] == "pending"
    assert status["payment"]["checkoutUrl"]

    for _ in range(2):
        completed = client.post(
            "/api/v1/payments/webhook",
            json={
                "publicId": first.get_json()["publicId"],
                "event": "checkout.completed",
            },
        )
        assert completed.get_json()["status"] == "paid"
    with app.app_context():
        assert PaymentTransaction.query.count() == 1
        assert PaymentStatusAudit.query.filter_by(
            previous_status="pending", new_status="paid"
        ).count() == 1


def test_partial_duplicate_and_cross_event_karaoke_reorders_are_rejected(client, app):
    with app.app_context():
        event = Post(
            slug="complete-karaoke-queue",
            title="Complete Karaoke Queue",
            starts_at=utc_now() + timedelta(days=2),
            event_kind="karaoke",
            status="published",
            is_active=True,
        )
        db.session.add(event)
        db.session.commit()
    public_ids = []
    for index in range(3):
        response = client.post(
            "/api/v1/public/karaoke/requests",
            json={
                "eventSlug": "complete-karaoke-queue",
                "displayName": f"Singer {index}",
                "songTitle": f"Song {index}",
            },
            headers=API_HEADERS,
        )
        public_ids.append(response.get_json()["publicId"])

    unlock(client, app, "karaoke-admin", ["karaoke_queue"])
    pending = client.get("/api/v1/admin/karaoke?status=pending").get_json()["items"]
    ids = [
        next(item["id"] for item in pending if item["publicId"] == public_id)
        for public_id in public_ids
    ]
    for request_id in ids:
        assert client.post(
            f"/api/v1/admin/karaoke/{request_id}/approve", headers=API_HEADERS
        ).status_code == 200

    partial = client.post(
        "/api/v1/admin/karaoke/reorder",
        json={"order": ids[:2]},
        headers=API_HEADERS,
    )
    duplicated = client.post(
        "/api/v1/admin/karaoke/reorder",
        json={"order": [ids[0], ids[0], ids[2]]},
        headers=API_HEADERS,
    )
    assert partial.status_code == duplicated.status_code == 409

    reordered = client.post(
        "/api/v1/admin/karaoke/reorder",
        json={"order": list(reversed(ids))},
        headers=API_HEADERS,
    )
    assert reordered.status_code == 200
    assert [item["id"] for item in reordered.get_json()["items"]] == list(
        reversed(ids)
    )
    with app.app_context():
        positions = [
            row.position
            for row in KaraokeSongRequest.query.filter(
                KaraokeSongRequest.id.in_(ids)
            ).all()
        ]
        assert sorted(positions) == [1, 2, 3]


def test_template_values_return_field_level_validation_errors(client, app):
    unlock(client, app, "posts-admin", ["posts"])
    cases = [
        ({"registrationLimitEnabled": True, "registrationLimit": "many"}, "registrationLimit"),
        ({"registrationPriceCents": "-1"}, "registrationPriceCents"),
        (
            {"registrationIsDeposit": True, "registrationPriceCents": "0"},
            "registrationPriceCents",
        ),
        ({"eventKind": "not-a-kind"}, "eventKind"),
        ({"socialSettings": []}, "socialSettings"),
    ]
    for index, (values, field) in enumerate(cases):
        response = client.post(
            "/api/v1/admin/post-templates",
            json={"name": f"Invalid {index}", **values},
            headers=API_HEADERS,
        )
        assert response.status_code == 422
        assert field in response.get_json()["error"]["details"]["fields"]


def test_offset_datetimes_are_stored_as_utc_and_dst_offsets_are_unambiguous(
    client, app
):
    assert parse_iso_to_utc("2026-07-14T12:00:00+02:00") == datetime(
        2026, 7, 14, 10, 0
    )
    assert parse_iso_to_utc("2026-03-29T01:30:00+01:00") == datetime(
        2026, 3, 29, 0, 30
    )
    assert parse_iso_to_utc("2026-03-29T03:30:00+02:00") == datetime(
        2026, 3, 29, 1, 30
    )

    unlock(client, app, "posts-admin", ["posts"])
    response = client.post(
        "/api/v1/admin/posts",
        json={
            "title": "Offset Event",
            "startsAt": "2026-07-14T12:00:00+02:00",
            "endsAt": "2026-07-14T14:00:00+02:00",
            "status": "draft",
        },
        headers=API_HEADERS,
    )
    assert response.status_code == 201
    assert response.get_json()["startsAt"] == "2026-07-14T10:00:00Z"
    assert response.get_json()["endsAt"] == "2026-07-14T12:00:00Z"


def test_access_unlock_is_limited_by_session_and_resets_next_window(
    client, app, monkeypatch
):
    now_epoch = 1_800_000_000.0
    monkeypatch.setattr("app.rate_limit.time.time", lambda: now_epoch)
    for _ in range(10):
        response = client.post(
            "/api/v1/access/unlock",
            json={"key": "never-log-this-secret"},
            headers=API_HEADERS,
        )
        assert response.status_code == 403
    limited = client.post(
        "/api/v1/access/unlock",
        json={"key": "never-log-this-secret"},
        headers=API_HEADERS,
    )
    assert limited.status_code == 429
    assert limited.headers["Retry-After"]

    with app.app_context():
        attempts = AccessUnlockAttempt.query.all()
        assert len(attempts) == 11
        assert all(
            "never-log-this-secret" not in f"{attempt.source_hash}{attempt.session_audit_id}"
            for attempt in attempts
        )
        db.session.add(
            AccessKey(
                key="valid-after-reset",
                scopes='["forms"]',
                expires_at=utc_now() + timedelta(days=1),
            )
        )
        db.session.commit()

    now_epoch += 15 * 60
    reset = client.post(
        "/api/v1/access/unlock",
        json={"key": "valid-after-reset"},
        headers=API_HEADERS,
    )
    assert reset.status_code == 200
    assert "forms" in reset.get_json()["capabilities"]


def test_title_edits_keep_slug_and_explicit_changes_redirect(client, app):
    unlock(client, app, "posts-admin", ["posts"])
    created = client.post(
        "/api/v1/admin/posts",
        json={"title": "Stable Address", "status": "published"},
        headers=API_HEADERS,
    ).get_json()
    old_slug = created["slug"]
    renamed = client.put(
        f"/api/v1/admin/posts/{created['id']}",
        json={"title": "A Completely Different Title"},
        headers=API_HEADERS,
    ).get_json()
    assert renamed["slug"] == old_slug

    changed = client.patch(
        f"/api/v1/admin/posts/{created['id']}/slug",
        json={"slug": "new-stable-address"},
        headers=API_HEADERS,
    )
    assert changed.status_code == 200
    assert changed.get_json()["slug"] == "new-stable-address"
    old_api = client.get(f"/api/v1/public/posts/{old_slug}")
    assert old_api.status_code == 200
    assert old_api.get_json()["slug"] == "new-stable-address"
    assert old_api.get_json()["redirectedFrom"] == old_slug
    direct = client.get(f"/events/{old_slug}", follow_redirects=False)
    assert direct.status_code == 308
    assert direct.headers["Location"].endswith("/events/new-stable-address")
    with app.app_context():
        assert PostSlugRedirect.query.filter_by(old_slug=old_slug).count() == 1


def test_default_calendar_month_uses_configured_local_timezone(client, app, monkeypatch):
    with app.app_context():
        db.session.add(
            Post(
                slug="local-august-event",
                title="Local August Event",
                starts_at=datetime(2026, 7, 31, 22, 30),
                status="published",
                is_active=True,
            )
        )
        db.session.commit()
    monkeypatch.setattr(
        "app.api.public.local_now",
        lambda: datetime(2026, 8, 1, 0, 30),
    )
    default = client.get("/api/v1/public/calendar").get_json()
    assert (default["year"], default["month"]) == (2026, 8)
    assert "local-august-event" in {event["slug"] for event in default["events"]}
    explicit_july = client.get(
        "/api/v1/public/calendar?year=2026&month=7"
    ).get_json()
    assert "local-august-event" not in {
        event["slug"] for event in explicit_july["events"]
    }


def test_remote_image_validation_and_csp_share_one_allow_list(client, app):
    unlock(client, app, "posts-admin", ["posts"])
    rejected = client.post(
        "/api/v1/admin/posts",
        json={"title": "Blocked image", "imageUrl": "https://blocked.example/a.jpg"},
        headers=API_HEADERS,
    )
    assert rejected.status_code == 422
    assert "imageUrl" in rejected.get_json()["error"]["details"]["fields"]

    app.config["REMOTE_IMAGE_ORIGINS"] = ("https://images.example",)
    accepted = client.post(
        "/api/v1/admin/posts",
        json={"title": "Allowed image", "imageUrl": "https://images.example/a.jpg"},
        headers=API_HEADERS,
    )
    assert accepted.status_code == 201
    response = client.get("/api/v1/public/config")
    assert "https://images.example" in response.headers["Content-Security-Policy"]


def test_public_post_query_count_does_not_grow_per_event(client, app):
    with app.app_context():
        for index in range(25):
            post = Post(
                slug=f"query-event-{index}",
                title=f"Query Event {index}",
                starts_at=utc_now() + timedelta(days=index + 1),
                status="published",
                is_active=True,
                registration_limit_enabled=True,
                registration_limit=10,
                registration_mode="queue",
            )
            db.session.add(post)
            db.session.flush()
            db.session.add(
                EventRegistration(
                    public_id=f"APP-QUERY-{index}",
                    post_id=post.id,
                    first_name="Query",
                    last_name=str(index),
                    email=f"query{index}@example.org",
                    occupation="student",
                    status="approved",
                )
            )
        db.session.commit()
        engine = db.engine

    statements = []

    def count_statement(*_args):
        statements.append(1)

    sqlalchemy_event.listen(engine, "before_cursor_execute", count_statement)
    try:
        response = client.get("/api/v1/public/posts")
    finally:
        sqlalchemy_event.remove(engine, "before_cursor_execute", count_statement)
    assert response.status_code == 200
    assert len(statements) <= 8
    assert len(response.get_json()["events"]) >= 25


def test_access_key_expiration_accepts_offset_timestamp(client, app):
    unlock(client, app, "access-root", ["access_keys"])
    expires = (
        datetime.now(timezone.utc)
        + timedelta(days=2)
    ).astimezone(ZoneInfo("Europe/Berlin"))
    created = client.post(
        "/api/v1/admin/access-keys",
        json={
            "label": "Offset key",
            "scopes": ["forms"],
            "expiresAt": expires.isoformat(),
        },
        headers=API_HEADERS,
    )
    assert created.status_code == 201
    assert created.get_json()["expiresAt"].endswith("Z")
