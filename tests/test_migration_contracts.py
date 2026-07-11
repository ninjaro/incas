from datetime import timedelta

from app.event_kinds import EVENT_KINDS
from app.demo_seed import seed_posts_demo_data
from app.models import AccessKey, EventRegistration, Post, db, get_configured_local_now
from tests.conftest import API_HEADERS, unlock


PUBLIC_POST_FIELDS = {
    "slug",
    "title",
    "summary",
    "eventKind",
    "eventKindMeta",
    "isEvent",
    "isPinned",
    "isLive",
    "publicationState",
    "startsAt",
    "endsAt",
    "durationMinutes",
    "imageUrl",
    "eventPublicId",
    "venue",
    "address",
    "city",
    "meetingPoint",
    "destination",
    "coordinates",
    "destinationCoordinates",
    "countryCode",
    "socialLinks",
    "features",
    "map",
    "registration",
    "bodyHtml",
}


def create_event(app, slug, *, kind="trip", capacity=0, price_cents=None, title=None):
    with app.app_context():
        event = Post(
            slug=slug,
            title=title or slug.replace("-", " ").title(),
            summary=f"Summary for {slug}",
            body="<p>Public description</p>",
            starts_at=get_configured_local_now() + timedelta(days=10),
            duration_minutes=180,
            event_kind=kind,
            status="published",
            is_active=True,
            registration_limit_enabled=capacity > 0,
            registration_limit=capacity or None,
            registration_price_cents=price_cents,
            registration_mode="queue" if capacity else "none",
            destination="Luxembourg City" if kind == "trip" else "",
            destination_latitude=49.6116 if kind == "trip" else None,
            destination_longitude=6.1319 if kind == "trip" else None,
            country_code={"country_evening": "PL", "breakfast": "TR"}.get(kind, ""),
            venue="SuperC" if kind == "opening_ceremony" else "",
            latitude=50.7787 if kind == "opening_ceremony" else None,
            longitude=6.0778 if kind == "opening_ceremony" else None,
        )
        db.session.add(event)
        db.session.commit()
        return event.id


def register(client, slug, index):
    response = client.post(
        f"/api/v1/public/events/{slug}/registrations",
        json={
            "firstName": f"Person{index}",
            "lastName": "Example",
            "email": f"person{index}@example.org",
            "occupation": "student",
            "comment": "Hello",
        },
        headers=API_HEADERS,
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()


def test_public_event_contract_covers_every_event_kind_and_sanitizes_html(client, app):
    now = get_configured_local_now()
    with app.app_context():
        for index, kind in enumerate(EVENT_KINDS):
            item = Post(
                slug=f"contract-{kind}",
                title={
                    "country_evening": "Poland",
                    "breakfast": "Turkish cuisine",
                    "trip": "Luxembourg City, Luxembourg",
                }.get(kind, f"Contract {kind}"),
                summary="Complete contract",
                body='<h2 onclick="bad()">Safe</h2><script>alert(1)</script><a href="javascript:bad()">Link</a>',
                starts_at=now + timedelta(days=20 + index),
                duration_minutes=120,
                event_kind=kind,
                status="published",
                is_active=True,
                country_code={"country_evening": "PL", "breakfast": "TR"}.get(kind, ""),
                destination="Luxembourg City" if kind == "trip" else "",
                destination_latitude=49.6116 if kind == "trip" else None,
                destination_longitude=6.1319 if kind == "trip" else None,
                venue="SuperC" if kind == "opening_ceremony" else "",
                latitude=50.7787 if kind == "opening_ceremony" else None,
                longitude=6.0778 if kind == "opening_ceremony" else None,
            )
            db.session.add(item)
        db.session.commit()

    for kind in EVENT_KINDS:
        response = client.get(f"/api/v1/public/posts/contract-{kind}")
        assert response.status_code == 200
        payload = response.get_json()
        assert PUBLIC_POST_FIELDS <= payload.keys()
        assert payload["eventKind"] == kind
        assert payload["eventKindMeta"]["id"] == kind
        assert "script" not in payload["bodyHtml"].lower()
        assert "onclick" not in payload["bodyHtml"].lower()
        assert "javascript:" not in payload["bodyHtml"].lower()
        assert "email" not in payload

    for kind in ("country_evening", "breakfast", "trip", "opening_ceremony"):
        assert client.get(f"/api/v1/public/posts/contract-{kind}").get_json()["map"]
    assert client.get("/api/v1/public/posts/contract-trip").get_json()["map"]["providerId"] == "openlayers"
    assert client.get("/api/v1/public/posts/contract-breakfast").get_json()["map"]["providerId"] == "amcharts-maps"
    opening_map = client.get("/api/v1/public/posts/contract-opening_ceremony").get_json()["map"]
    assert opening_map["providerId"] == "amcharts-maps"
    assert opening_map["target"]["kind"] == "marker"


def test_registration_waiting_list_promotes_after_cancellation(client, app):
    post_id = create_event(app, "free-capacity-event", capacity=1, price_cents=None)
    first = register(client, "free-capacity-event", 1)
    second = register(client, "free-capacity-event", 2)
    assert first["status"] == "approved"
    assert second["status"] == "waiting_list"
    assert second["waitingListPosition"] == 1

    detail = client.get("/api/v1/public/posts/free-capacity-event").get_json()
    assert detail["registration"]["capacity"] == 1
    assert detail["registration"]["nonCancelledCount"] == 2
    assert detail["registration"]["waitingListCount"] == 1

    unlock(client, app, "registration-admin", ["event_registrations"])
    queue = client.get(f"/api/v1/admin/events/{post_id}/registrations").get_json()
    first_admin = next(item for item in queue["items"] if item["publicId"] == first["publicId"])
    updated = client.patch(
        f"/api/v1/admin/event-registrations/{first_admin['id']}",
        json={"status": "cancelled"},
        headers=API_HEADERS,
    )
    assert updated.status_code == 200
    assert [item["publicId"] for item in updated.get_json()["promoted"]] == [second["publicId"]]
    assert client.get(f"/api/v1/public/registrations/{second['publicId']}").get_json()["status"] == "approved"


def test_paid_registration_is_required_and_webhook_is_idempotent(client, app):
    create_event(app, "paid-capacity-event", capacity=1, price_cents=200)
    missing = client.post(
        "/api/v1/payments/checkout",
        json={"postSlug": "paid-capacity-event"},
        headers=API_HEADERS,
    )
    assert missing.status_code == 422
    registration = register(client, "paid-capacity-event", 3)
    assert registration["status"] == "waiting_payment"
    checkout = client.post(
        "/api/v1/payments/checkout",
        json={
            "postSlug": "paid-capacity-event",
            "registrationPublicId": registration["publicId"],
        },
        headers=API_HEADERS,
    ).get_json()
    for _ in range(2):
        response = client.post(
            "/api/v1/payments/webhook",
            json={"publicId": checkout["publicId"], "event": "checkout.completed"},
        )
        assert response.get_json()["status"] == "paid"
    assert client.get(f"/api/v1/public/registrations/{registration['publicId']}").get_json()["status"] == "approved"


def test_contact_form_reaches_shared_admin_inbox(client, app):
    submitted = client.post(
        "/api/v1/public/contact",
        json={"name": "Ada", "email": "ada@example.org", "subject": "Question", "message": "Hello"},
        headers=API_HEADERS,
    )
    assert submitted.status_code == 201
    unlock(client, app, "forms-admin", ["forms"])
    payload = client.get("/api/v1/admin/forms?q=ada").get_json()
    item = next(entry for entry in payload["items"] if entry["publicId"] == submitted.get_json()["submissionId"])
    updated = client.patch(
        f"/api/v1/admin/forms/contact/{item['id']}",
        json={"isViewed": True, "status": "resolved"},
        headers=API_HEADERS,
    ).get_json()
    assert updated["isViewed"] is True
    assert updated["status"] == "resolved"


def test_generated_access_key_is_hashed_and_expiry_revokes_live_session(client, app):
    assert client.get("/api/v1/session").get_json()["hasAccessKeys"] is False
    unlock(client, app, "access-root", ["access_keys"])
    assert client.get("/api/v1/session").get_json()["hasAccessKeys"] is True
    created = client.post(
        "/api/v1/admin/access-keys",
        json={
            "label": "Temporary forms reviewer",
            "scopes": ["forms"],
            "expiresAt": (get_configured_local_now() + timedelta(days=1)).isoformat(),
        },
        headers=API_HEADERS,
    )
    assert created.status_code == 201
    generated = created.get_json()
    secret = generated["secret"]
    with app.app_context():
        stored = db.session.get(AccessKey, generated["id"])
        assert stored.key.startswith("sha256:")
        assert secret not in stored.key

    temporary_client = app.test_client()
    unlocked = temporary_client.post(
        "/api/v1/access/unlock",
        json={"key": secret},
        headers=API_HEADERS,
    )
    assert "forms" in unlocked.get_json()["capabilities"]
    assert temporary_client.get("/api/v1/admin/forms").status_code == 200

    expired = client.post(
        f"/api/v1/admin/access-keys/{generated['id']}/expire",
        headers=API_HEADERS,
    )
    assert expired.get_json()["status"] == "expired"
    assert temporary_client.get("/api/v1/admin/forms").status_code == 403


def test_karaoke_queues_and_reordering_cannot_cross_events(client, app):
    create_event(app, "karaoke-one", kind="karaoke")
    create_event(app, "karaoke-two", kind="karaoke")
    public_ids = []
    for index, slug in enumerate(("karaoke-one", "karaoke-two"), 1):
        response = client.post(
            "/api/v1/public/karaoke/requests",
            json={"eventSlug": slug, "displayName": f"Singer {index}", "songTitle": f"Song {index}"},
            headers=API_HEADERS,
        )
        assert response.status_code == 201
        public_ids.append(response.get_json()["publicId"])

    unlock(client, app, "karaoke-scoped-admin", ["karaoke_queue"])
    entries = client.get("/api/v1/admin/karaoke?status=pending").get_json()["items"]
    ids = [next(item["id"] for item in entries if item["publicId"] == public_id) for public_id in public_ids]
    for request_id in ids:
        assert client.post(f"/api/v1/admin/karaoke/{request_id}/approve", headers=API_HEADERS).status_code == 200
    cross_event = client.post(
        "/api/v1/admin/karaoke/reorder",
        json={"order": ids},
        headers=API_HEADERS,
    )
    assert cross_event.status_code == 409
    assert len(client.get("/api/v1/public/karaoke/queue?event=karaoke-one").get_json()["items"]) == 1
    assert len(client.get("/api/v1/public/karaoke/queue?event=karaoke-two").get_json()["items"]) == 1


def test_demo_post_seeding_is_idempotent_and_applies_catalog_corrections(app):
    with app.app_context():
        before = Post.query.count()
        item = Post.query.filter_by(slug="incas-community-update").one()
        item.summary = "stale demo copy"
        db.session.commit()

        seed_posts_demo_data()
        assert Post.query.count() == before
        assert Post.query.filter_by(slug="incas-community-update").one().summary != "stale demo copy"
        opening = Post.query.filter(Post.slug.startswith("incas-opening-ceremony-")).one()
        assert opening.registration_limit == 120
        assert opening.registration_price_cents is None
