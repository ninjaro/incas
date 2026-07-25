from datetime import datetime, timedelta

from app.datetime_utils import utc_now
from app.models import (
    PageThemeSelection,
    PaymentTransaction,
    Post,
    SocialPublication,
    db,
    get_configured_local_now,
)
from tests.conftest import API_HEADERS, unlock


def karaoke_event_slug(app):
    with app.app_context():
        return Post.query.filter_by(event_kind="karaoke").first().slug


def register_for_event(client, slug, email="participant@example.org"):
    response = client.post(
        f"/api/v1/public/events/{slug}/registrations",
        json={
            "firstName": "Test",
            "lastName": "Participant",
            "email": email,
            "occupation": "student",
            "comment": "",
        },
        headers=API_HEADERS,
    )
    assert response.status_code == 201
    return response.get_json()


def test_write_requires_csrf_header(client):
    response = client.post("/api/v1/admin/theme-votes", json={})
    assert response.status_code == 403
    assert response.get_json()["error"]["code"] == "csrf_header_missing"


def test_admin_endpoints_require_capability(client):
    for path in (
        "/api/v1/admin/themes",
        "/api/v1/admin/posts",
        "/api/v1/admin/language-tandem",
        "/api/v1/admin/karaoke",
    ):
        response = client.get(path)
        assert response.status_code == 403, path
        assert response.get_json()["error"]["code"] == "capability_required"


def test_unlock_expands_capabilities(client, app):
    payload = unlock(client, app, "tandem-key", ["language_tandem"])
    assert "language_tandem_blind" in payload["capabilities"]
    assert "language_tandem_private" in payload["capabilities"]
    assert "language_tandem_corrections" not in payload["capabilities"]


def test_theme_force_implies_review(client, app):
    payload = unlock(client, app, "force-key", ["theme_force"])
    assert "theme_review" in payload["capabilities"]
    assert client.get("/api/v1/admin/themes").status_code == 200


def test_blind_tandem_excludes_personal_data(client, app):
    unlock(client, app, "blind-key", ["language_tandem_blind"])
    response = client.get("/api/v1/admin/language-tandem")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["items"], "seeded tandem requests expected"
    for item in payload["items"]:
        for field in ("firstName", "lastName", "email", "comment", "id"):
            assert field not in item, f"blind response leaked {field}"
        assert "ref" in item and item["ref"]


def test_private_tandem_includes_personal_data(client, app):
    unlock(client, app, "private-key", ["language_tandem"])
    payload = client.get("/api/v1/admin/language-tandem").get_json()
    assert payload["items"][0]["email"]


def test_blind_matching_works(client, app):
    unlock(client, app, "blind-key", ["language_tandem_blind"])
    items = client.get("/api/v1/admin/language-tandem").get_json()["items"]
    ref = items[0]["ref"]
    response = client.get(f"/api/v1/admin/language-tandem/{ref}/matches")
    assert response.status_code == 200
    groups = response.get_json()["groups"]
    for matches in groups.values():
        for match in matches:
            assert "email" not in match["candidate"]


def test_corrections_require_stronger_capability(client, app):
    unlock(client, app, "blind-key", ["language_tandem_blind"])
    items = client.get("/api/v1/admin/language-tandem").get_json()["items"]
    ref = items[0]["ref"]
    response = client.put(
        f"/api/v1/admin/language-tandem/{ref}",
        json={"occupation": "student"},
        headers=API_HEADERS,
    )
    assert response.status_code == 403


def test_theme_vote_and_replace(client, app):
    unlock(client, app, "review-key", ["theme_review"])
    first = client.post(
        "/api/v1/admin/theme-votes",
        json={"page": "landing", "theme": "editorial"},
        headers=API_HEADERS,
    )
    assert first.status_code == 200
    second = client.post(
        "/api/v1/admin/theme-votes",
        json={"page": "landing", "theme": "hero"},
        headers=API_HEADERS,
    )
    assert second.status_code == 200
    votes = second.get_json()["votes"]
    # Re-voting replaces the previous vote instead of adding another.
    assert votes == {"hero": 1}


def test_theme_review_cannot_force(client, app):
    unlock(client, app, "review-key", ["theme_review"])
    response = client.post(
        "/api/v1/admin/theme-forces",
        json={"page": "landing", "theme": "editorial"},
        headers=API_HEADERS,
    )
    assert response.status_code == 403


def test_theme_force_and_cooldown(client, app):
    unlock(client, app, "force-key", ["theme_force"])
    first = client.post(
        "/api/v1/admin/theme-forces",
        json={"page": "landing", "theme": "editorial"},
        headers=API_HEADERS,
    )
    assert first.status_code == 200

    config = client.get("/api/v1/public/config").get_json()
    assert config["themes"]["landing"] == "editorial"

    second = client.post(
        "/api/v1/admin/theme-forces",
        json={"page": "landing", "theme": "hero"},
        headers=API_HEADERS,
    )
    assert second.status_code == 409
    error = second.get_json()["error"]
    assert error["code"] == "theme_force_locked"
    assert error["details"]["availableAt"]

    # Voting is never blocked by the force lock.
    vote = client.post(
        "/api/v1/admin/theme-votes",
        json={"page": "landing", "theme": "hero"},
        headers=API_HEADERS,
    )
    assert vote.status_code == 200

    # Other pages are not locked (the lock is per page).
    other = client.post(
        "/api/v1/admin/theme-forces",
        json={"page": "calendar", "theme": "agenda"},
        headers=API_HEADERS,
    )
    assert other.status_code == 200


def test_theme_force_allowed_after_cooldown(client, app):
    unlock(client, app, "force-key", ["theme_force"])
    client.post(
        "/api/v1/admin/theme-forces",
        json={"page": "landing", "theme": "editorial"},
        headers=API_HEADERS,
    )
    with app.app_context():
        selection = PageThemeSelection.query.filter_by(page_id="landing").first()
        selection.last_forced_at = utc_now() - timedelta(hours=25)
        db.session.commit()

    response = client.post(
        "/api/v1/admin/theme-forces",
        json={"page": "landing", "theme": "hero"},
        headers=API_HEADERS,
    )
    assert response.status_code == 200

    audit = client.get("/api/v1/admin/theme-audit?page=landing").get_json()
    assert len(audit["entries"]) == 2
    assert audit["entries"][0]["newTheme"] == "hero"
    assert audit["entries"][0]["previousTheme"] == "editorial"


def test_invalid_theme_falls_back_to_default(client, app):
    with app.app_context():
        db.session.add(PageThemeSelection(page_id="landing", theme_id="deleted-theme"))
        db.session.commit()
    config = client.get("/api/v1/public/config").get_json()
    assert config["themes"]["landing"] == "hero"


def test_post_draft_schedule_publish(client, app):
    unlock(client, app, "posts-key", ["posts"])

    created = client.post(
        "/api/v1/admin/posts",
        json={"title": "Test Draft Event", "status": "draft"},
        headers=API_HEADERS,
    )
    assert created.status_code == 201
    post = created.get_json()
    assert post["status"] == "draft"

    # Drafts are not publicly visible.
    public = client.get(f"/api/v1/public/posts/{post['slug']}")
    assert public.status_code == 404

    future = (get_configured_local_now() + timedelta(days=1)).isoformat()
    scheduled = client.put(
        f"/api/v1/admin/posts/{post['id']}",
        json={"status": "scheduled", "publishAt": future},
        headers=API_HEADERS,
    )
    assert scheduled.status_code == 200
    assert scheduled.get_json()["status"] == "scheduled"
    assert client.get(f"/api/v1/public/posts/{post['slug']}").status_code == 404

    # A scheduled post whose time has passed becomes public automatically.
    past = (get_configured_local_now() - timedelta(minutes=5)).isoformat()
    client.put(
        f"/api/v1/admin/posts/{post['id']}",
        json={"status": "scheduled", "publishAt": past},
        headers=API_HEADERS,
    )
    detail = client.get(f"/api/v1/admin/posts/{post['id']}").get_json()
    assert detail["status"] == "published"
    assert client.get(f"/api/v1/public/posts/{post['slug']}").status_code == 200


def test_scheduled_status_requires_publish_at(client, app):
    unlock(client, app, "posts-key", ["posts"])
    response = client.post(
        "/api/v1/admin/posts",
        json={"title": "No Date", "status": "scheduled"},
        headers=API_HEADERS,
    )
    assert response.status_code == 422
    assert "publishAt" in response.get_json()["error"]["details"]["fields"]


def test_post_optional_fields_can_be_explicitly_cleared(client, app):
    unlock(client, app, "posts-key", ["posts"])
    future_start = get_configured_local_now() + timedelta(days=3)
    created_response = client.post(
        "/api/v1/admin/posts",
        json={
            "title": "Temporary Trip",
            "eventKind": "trip",
            "startsAt": future_start.isoformat(),
            "endsAt": (future_start + timedelta(hours=2)).isoformat(),
            "status": "scheduled",
            "publishAt": (get_configured_local_now() + timedelta(days=1)).isoformat(),
        },
        headers=API_HEADERS,
    )
    assert created_response.status_code == 201, created_response.get_json()
    created = created_response.get_json()

    response = client.put(
        f"/api/v1/admin/posts/{created['id']}",
        json={
            "eventKind": None,
            "startsAt": None,
            "endsAt": None,
            "status": "draft",
            "publishAt": None,
        },
        headers=API_HEADERS,
    )
    assert response.status_code == 200
    payload = response.get_json()
    for field in ("eventKind", "startsAt", "endsAt", "publishAt"):
        assert payload[field] is None


def test_template_lifecycle(client, app):
    unlock(client, app, "posts-key", ["posts"])

    created = client.post(
        "/api/v1/admin/post-templates",
        json={"name": "Karaoke Night", "titlePattern": "Karaoke Night", "eventKind": "karaoke"},
        headers=API_HEADERS,
    )
    assert created.status_code == 201
    template = created.get_json()

    updated = client.put(
        f"/api/v1/admin/post-templates/{template['id']}",
        json={"summary": "Sing with us"},
        headers=API_HEADERS,
    )
    assert updated.get_json()["summary"] == "Sing with us"

    duplicated = client.post(
        f"/api/v1/admin/post-templates/{template['id']}/duplicate",
        headers=API_HEADERS,
    )
    assert duplicated.status_code == 201
    assert duplicated.get_json()["name"].endswith("(copy)")

    from_template = client.post(
        "/api/v1/admin/posts/from-template",
        json={"templateId": template["id"]},
        headers=API_HEADERS,
    )
    assert from_template.status_code == 201
    assert from_template.get_json()["status"] == "draft"
    assert from_template.get_json()["eventKind"] == "karaoke"

    deleted = client.delete(
        f"/api/v1/admin/post-templates/{template['id']}",
        headers=API_HEADERS,
    )
    assert deleted.status_code == 200


def test_karaoke_public_flow(client, app):
    event_slug = karaoke_event_slug(app)
    submitted = client.post(
        "/api/v1/public/karaoke/requests",
        json={
            "displayName": "Ana",
            "songTitle": "Bohemian Rhapsody",
            "artist": "Queen",
            "eventSlug": event_slug,
        },
        headers=API_HEADERS,
    )
    assert submitted.status_code == 201
    public_id = submitted.get_json()["publicId"]

    tracked = client.get(f"/api/v1/public/karaoke/requests/{public_id}").get_json()
    assert tracked["status"] == "pending"
    assert tracked["queuePosition"] is None

    batch = client.post(
        "/api/v1/public/karaoke/requests/track",
        json={"publicIds": [public_id, public_id, "KRQ-missing"]},
        headers=API_HEADERS,
    )
    assert batch.status_code == 200
    assert [item["publicId"] for item in batch.get_json()["items"]] == [public_id]
    assert batch.get_json()["missing"] == ["KRQ-missing"]

    # Pending requests are not in the public queue.
    queue = client.get(f"/api/v1/public/karaoke/queue?event={event_slug}").get_json()
    assert all(entry["publicId"] != public_id for entry in queue["items"])


def test_karaoke_validation(client):
    response = client.post(
        "/api/v1/public/karaoke/requests",
        json={"displayName": "", "songTitle": ""},
        headers=API_HEADERS,
    )
    assert response.status_code == 422


def test_karaoke_admin_flow(client, app):
    unlock(client, app, "karaoke-key", ["karaoke_queue"])
    event_slug = karaoke_event_slug(app)

    ids = []
    for index in range(3):
        response = client.post(
            "/api/v1/public/karaoke/requests",
            json={
                "displayName": f"Singer {index}",
                "songTitle": f"Song {index}",
                "eventSlug": event_slug,
            },
            headers=API_HEADERS,
        )
        public_id = response.get_json()["publicId"]
        items = client.get("/api/v1/admin/karaoke?status=pending").get_json()["items"]
        ids.append(next(item["id"] for item in items if item["publicId"] == public_id))

    for request_id in ids:
        approved = client.post(f"/api/v1/admin/karaoke/{request_id}/approve", headers=API_HEADERS)
        assert approved.status_code == 200
        assert approved.get_json()["status"] == "approved"

    # Approving an already-approved request is rejected.
    conflict = client.post(f"/api/v1/admin/karaoke/{ids[0]}/approve", headers=API_HEADERS)
    assert conflict.status_code == 409

    # Public queue shows names but no contact/note fields.
    queue = client.get(f"/api/v1/public/karaoke/queue?event={event_slug}").get_json()["items"]
    assert [entry["queuePosition"] for entry in queue] == [1, 2, 3]
    assert "contact" not in queue[0] and "note" not in queue[0]

    # Reorder: reverse the queue.
    reordered = client.post(
        "/api/v1/admin/karaoke/reorder",
        json={"order": list(reversed(ids))},
        headers=API_HEADERS,
    )
    assert reordered.status_code == 200
    queue = client.get(f"/api/v1/public/karaoke/queue?event={event_slug}").get_json()["items"]
    assert queue[0]["displayName"] == "Singer 2"

    # Reordering with a stale id set is rejected.
    stale = client.post(
        "/api/v1/admin/karaoke/reorder",
        json={"order": ids + [99999]},
        headers=API_HEADERS,
    )
    assert stale.status_code == 409

    # performing -> completed
    client.post(f"/api/v1/admin/karaoke/{ids[2]}/performing", headers=API_HEADERS)
    completed = client.post(f"/api/v1/admin/karaoke/{ids[2]}/complete", headers=API_HEADERS)
    assert completed.get_json()["status"] == "completed"

    # cancel + restore returns to pending moderation.
    client.post(f"/api/v1/admin/karaoke/{ids[0]}/cancel", headers=API_HEADERS)
    restored = client.post(f"/api/v1/admin/karaoke/{ids[0]}/restore", headers=API_HEADERS)
    assert restored.get_json()["status"] == "pending"

    audit = client.get("/api/v1/admin/karaoke/audit").get_json()["entries"]
    assert any(entry["action"] == "reorder" for entry in audit)


def test_social_mock_publish_and_retry(client, app):
    unlock(client, app, "posts-key", ["posts"])
    created = client.post(
        "/api/v1/admin/posts",
        json={"title": "Social Test Post", "status": "published"},
        headers=API_HEADERS,
    ).get_json()

    published = client.post(
        f"/api/v1/admin/posts/{created['id']}/social",
        json={"channels": ["facebook", "instagram"]},
        headers=API_HEADERS,
    )
    assert published.status_code == 200
    results = published.get_json()["results"]
    assert len(results) == 2
    for result in results:
        assert result["status"] == "published"
        assert result["isSimulated"] is True
        assert result["providerPostId"]
        assert result["permalink"]

    # Re-publishing does not duplicate already-published channels.
    again = client.post(
        f"/api/v1/admin/posts/{created['id']}/social",
        json={"channels": ["facebook"]},
        headers=API_HEADERS,
    ).get_json()["results"]
    with app.app_context():
        count = SocialPublication.query.filter_by(post_id=created["id"], provider="facebook").count()
    assert count == 1
    assert again[0]["attemptCount"] == 1


def test_payment_mock_flow(client, app):
    unlock(client, app, "posts-key", ["posts"])
    post = client.post(
        "/api/v1/admin/posts",
        json={
            "title": "Paid Trip",
            "status": "published",
            "startsAt": (get_configured_local_now() + timedelta(days=3)).isoformat(),
            "registrationLimitEnabled": True,
            "registrationLimit": 10,
            "registrationPriceCents": 1500,
        },
        headers=API_HEADERS,
    ).get_json()
    registration = register_for_event(client, post["slug"])
    assert registration["status"] == "waiting_payment"

    checkout = client.post(
        "/api/v1/payments/checkout",
        json={
            "postSlug": post["slug"],
            "registrationPublicId": registration["publicId"],
            "amountCents": 1,
        },
        headers=API_HEADERS,
    )
    assert checkout.status_code == 201
    payload = checkout.get_json()
    # Server-side price wins over any client-sent amount.
    assert payload["amountCents"] == 1500
    assert payload["simulated"] is True
    public_id = payload["publicId"]

    paid = client.post(
        f"/api/v1/payments/{public_id}/simulate",
        json={"outcome": "success"},
        headers=API_HEADERS,
    )
    assert paid.get_json()["status"] == "paid"

    # Finalized payments cannot be re-simulated.
    replay = client.post(
        f"/api/v1/payments/{public_id}/simulate",
        json={"outcome": "failure"},
        headers=API_HEADERS,
    )
    assert replay.status_code == 409


def test_payment_failure_and_webhook(client, app):
    unlock(client, app, "posts-key", ["posts"])
    post = client.post(
        "/api/v1/admin/posts",
        json={
            "title": "Paid Dinner",
            "status": "published",
            "startsAt": (get_configured_local_now() + timedelta(days=4)).isoformat(),
            "registrationLimitEnabled": True,
            "registrationLimit": 10,
            "registrationPriceCents": 800,
        },
        headers=API_HEADERS,
    ).get_json()
    registration = register_for_event(client, post["slug"], "dinner@example.org")

    first = client.post(
        "/api/v1/payments/checkout",
        json={"postSlug": post["slug"], "registrationPublicId": registration["publicId"]},
        headers=API_HEADERS,
    ).get_json()
    failed = client.post(
        f"/api/v1/payments/{first['publicId']}/simulate",
        json={"outcome": "failure"},
        headers=API_HEADERS,
    ).get_json()
    assert failed["status"] == "failed"

    second = client.post(
        "/api/v1/payments/checkout",
        json={"postSlug": post["slug"], "registrationPublicId": registration["publicId"]},
        headers=API_HEADERS,
    ).get_json()
    webhook = client.post(
        "/api/v1/payments/webhook",
        json={"publicId": second["publicId"], "event": "checkout.completed"},
    )
    assert webhook.status_code == 200
    assert webhook.get_json()["status"] == "paid"


def test_payment_not_required(client, app):
    unlock(client, app, "posts-key", ["posts"])
    post = client.post(
        "/api/v1/admin/posts",
        json={"title": "Free Meetup", "status": "published"},
        headers=API_HEADERS,
    ).get_json()
    response = client.post(
        "/api/v1/payments/checkout", json={"postSlug": post["slug"]}, headers=API_HEADERS
    )
    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "payment_not_required"
