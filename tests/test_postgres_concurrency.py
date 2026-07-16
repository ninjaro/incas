from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier

import pytest

from app.datetime_utils import utc_now
from app.models import (
    AccessKey,
    EventRegistration,
    KaraokeSongRequest,
    PageThemeSelection,
    PaymentTransaction,
    Post,
    db,
)
from tests.conftest import API_HEADERS


def require_postgres(app):
    with app.app_context():
        if db.engine.dialect.name != "postgresql":
            pytest.skip("PostgreSQL concurrency contract")


def add_key(app, phrase, scopes):
    with app.app_context():
        db.session.add(
            AccessKey(
                key=phrase,
                scopes=__import__("json").dumps(scopes),
                expires_at=utc_now() + timedelta(days=1),
            )
        )
        db.session.commit()


def unlock_client(app, phrase):
    client = app.test_client()
    response = client.post(
        "/api/v1/access/unlock",
        json={"key": phrase},
        headers=API_HEADERS,
    )
    assert response.status_code == 200, response.get_json()
    return client


def test_postgres_final_capacity_is_serialized(app):
    require_postgres(app)
    with app.app_context():
        db.session.add(
            Post(
                slug="postgres-final-place",
                title="Postgres Final Place",
                starts_at=utc_now() + timedelta(days=3),
                status="published",
                is_active=True,
                registration_limit_enabled=True,
                registration_limit=1,
                registration_mode="queue",
            )
        )
        db.session.commit()
    barrier = Barrier(2)

    def submit(index):
        client = app.test_client()
        barrier.wait()
        response = client.post(
            "/api/v1/public/events/postgres-final-place/registrations",
            json={
                "firstName": f"Concurrent {index}",
                "lastName": "Person",
                "email": f"postgres{index}@example.org",
                "occupation": "student",
                "comment": "",
            },
            headers=API_HEADERS,
        )
        assert response.status_code == 201, response.get_json()
        return response.get_json()["status"]

    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = list(executor.map(submit, (1, 2)))
    assert sorted(statuses) == ["approved", "waiting_list"]


def test_postgres_checkout_creation_is_idempotent_under_race(app):
    require_postgres(app)
    with app.app_context():
        post = Post(
            slug="postgres-payment-race",
            title="Postgres Payment Race",
            starts_at=utc_now() + timedelta(days=3),
            status="published",
            is_active=True,
            registration_limit_enabled=True,
            registration_limit=1,
            registration_price_cents=500,
            registration_mode="queue",
        )
        db.session.add(post)
        db.session.flush()
        registration = EventRegistration(
            public_id="APP-POSTGRES-PAYMENT",
            post_id=post.id,
            first_name="Payment",
            last_name="Race",
            email="payment-race@example.org",
            occupation="student",
            status="waiting_payment",
            payment_expires_at=utc_now() + timedelta(minutes=20),
        )
        db.session.add(registration)
        db.session.commit()
    barrier = Barrier(2)

    def checkout(_index):
        client = app.test_client()
        barrier.wait()
        response = client.post(
            "/api/v1/payments/checkout",
            json={
                "postSlug": "postgres-payment-race",
                "registrationPublicId": "APP-POSTGRES-PAYMENT",
            },
            headers=API_HEADERS,
        )
        assert response.status_code in {200, 201}, response.get_json()
        return response.get_json()["publicId"]

    with ThreadPoolExecutor(max_workers=2) as executor:
        payment_ids = list(executor.map(checkout, (1, 2)))
    assert len(set(payment_ids)) == 1
    with app.app_context():
        assert PaymentTransaction.query.count() == 1


def test_postgres_theme_force_guard_allows_one_winner(app):
    require_postgres(app)
    add_key(app, "postgres-theme", ["theme_force"])
    with app.app_context():
        PageThemeSelection.query.filter_by(page_id="calendar").delete()
        db.session.commit()
    barrier = Barrier(2)

    def force(theme):
        client = unlock_client(app, "postgres-theme")
        barrier.wait()
        return client.post(
            "/api/v1/admin/theme-forces",
            json={"page": "calendar", "theme": theme},
            headers=API_HEADERS,
        ).status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = list(executor.map(force, ("agenda", "timeline")))
    assert sorted(statuses) == [200, 409]


def test_postgres_karaoke_approval_positions_are_unique(app):
    require_postgres(app)
    add_key(app, "postgres-karaoke", ["karaoke_queue"])
    with app.app_context():
        post = Post(
            slug="postgres-karaoke",
            title="Postgres Karaoke",
            starts_at=utc_now() + timedelta(days=3),
            event_kind="karaoke",
            status="published",
            is_active=True,
        )
        db.session.add(post)
        db.session.flush()
        requests = [
            KaraokeSongRequest(
                public_id=f"KRQ-POSTGRES-{index}",
                post_id=post.id,
                display_name=f"Singer {index}",
                song_title=f"Song {index}",
            )
            for index in (1, 2)
        ]
        db.session.add_all(requests)
        db.session.commit()
        request_ids = [item.id for item in requests]
    barrier = Barrier(2)

    def approve(request_id):
        client = unlock_client(app, "postgres-karaoke")
        barrier.wait()
        response = client.post(
            f"/api/v1/admin/karaoke/{request_id}/approve",
            headers=API_HEADERS,
        )
        assert response.status_code == 200, response.get_json()

    with ThreadPoolExecutor(max_workers=2) as executor:
        list(executor.map(approve, request_ids))
    with app.app_context():
        positions = [
            item.position
            for item in KaraokeSongRequest.query.filter(
                KaraokeSongRequest.id.in_(request_ids)
            ).all()
        ]
        assert sorted(positions) == [1, 2]
