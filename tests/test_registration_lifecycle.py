import csv
import io
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier

import pytest

from app.api.registrations import _safe_csv_cell
from app import create_app
from app.api.karaoke import new_public_id as new_karaoke_public_id
from app.models import EventRegistration, PaymentStatusAudit, Post, db, get_configured_local_now
from app.routes.helpers.event_registrations import build_event_registration_public_id
from tests.conftest import API_HEADERS, unlock


def create_event(app, slug, *, capacity=1, price_cents=None):
    with app.app_context():
        item = Post(
            slug=slug,
            title=slug.replace("-", " ").title(),
            starts_at=get_configured_local_now() + timedelta(days=7),
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


def register(client, slug, index):
    response = client.post(
        f"/api/v1/public/events/{slug}/registrations",
        json={
            "firstName": f"Person {index}",
            "lastName": "Example",
            "email": f"person{index}@example.org",
            "occupation": "student",
            "comment": "",
        },
        headers=API_HEADERS,
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()


def admin_registration(client, post_id, public_id):
    payload = client.get(f"/api/v1/admin/events/{post_id}/registrations").get_json()
    return next(item for item in payload["items"] if item["publicId"] == public_id)


def test_paid_registration_transitions_follow_payment_and_refund_state(client, app):
    post_id = create_event(app, "transition-paid", price_cents=200)
    first = register(client, "transition-paid", 1)
    second = register(client, "transition-paid", 2)
    assert first["status"] == "waiting_payment"
    assert second["status"] == "waiting_list"

    unlock(client, app, "registration-admin", ["event_registrations"])
    first_admin = admin_registration(client, post_id, first["publicId"])
    assert first_admin["allowedTransitions"] == ["cancelled"]
    for forbidden in ("approved", "waiting_refund", "waiting_list"):
        response = client.patch(
            f"/api/v1/admin/event-registrations/{first_admin['id']}",
            json={"status": forbidden},
            headers=API_HEADERS,
        )
        assert response.status_code == 409

    checkout = client.post(
        "/api/v1/payments/checkout",
        json={
            "postSlug": "transition-paid",
            "registrationPublicId": first["publicId"],
        },
        headers=API_HEADERS,
    ).get_json()
    assert "postId" not in checkout
    assert "registrationId" not in checkout
    paid = client.post(
        f"/api/v1/payments/{checkout['publicId']}/simulate",
        json={"outcome": "success"},
        headers=API_HEADERS,
    )
    assert paid.get_json()["status"] == "paid"

    first_admin = admin_registration(client, post_id, first["publicId"])
    assert first_admin["allowedTransitions"] == ["waiting_refund"]
    refund = client.patch(
        f"/api/v1/admin/event-registrations/{first_admin['id']}",
        json={"status": "waiting_refund"},
        headers=API_HEADERS,
    )
    assert refund.status_code == 200
    assert refund.get_json()["item"]["payment"]["status"] == "refund_pending"
    assert [item["publicId"] for item in refund.get_json()["promoted"]] == [second["publicId"]]

    payments = client.get("/api/v1/admin/payments").get_json()["items"]
    payment = next(item for item in payments if item["publicId"] == checkout["publicId"])
    assert payment["audit"][0]["newStatus"] == "refund_pending"
    completed = client.patch(
        f"/api/v1/admin/payments/{payment['id']}",
        json={"status": "refunded", "note": "Refund confirmed"},
        headers=API_HEADERS,
    )
    assert completed.status_code == 200
    assert completed.get_json()["status"] == "refunded"
    assert completed.get_json()["audit"][0]["note"] == "Refund confirmed"

    public = client.get(f"/api/v1/public/registrations/{first['publicId']}").get_json()
    assert public["status"] == "cancelled"
    for private_field in ("id", "firstName", "lastName", "email", "occupation", "comment", "allowedTransitions"):
        assert private_field not in public
    assert client.get(f"/api/v1/public/registrations/{second['publicId']}").get_json()["status"] == "waiting_payment"

    with app.app_context():
        assert PaymentStatusAudit.query.count() == 3


def test_free_registration_cancellation_promotes_and_reopen_requeues(client, app):
    post_id = create_event(app, "transition-free")
    first = register(client, "transition-free", 1)
    second = register(client, "transition-free", 2)
    unlock(client, app, "registration-admin", ["event_registrations"])

    first_admin = admin_registration(client, post_id, first["publicId"])
    assert first_admin["allowedTransitions"] == ["cancelled"]
    cancelled = client.patch(
        f"/api/v1/admin/event-registrations/{first_admin['id']}",
        json={"status": "cancelled"},
        headers=API_HEADERS,
    ).get_json()
    assert [item["publicId"] for item in cancelled["promoted"]] == [second["publicId"]]

    reopened = client.patch(
        f"/api/v1/admin/event-registrations/{first_admin['id']}",
        json={"status": "waiting_list"},
        headers=API_HEADERS,
    )
    assert reopened.status_code == 200
    assert reopened.get_json()["item"]["status"] == "waiting_list"
    invalid_refund = client.patch(
        f"/api/v1/admin/event-registrations/{first_admin['id']}",
        json={"status": "waiting_refund"},
        headers=API_HEADERS,
    )
    assert invalid_refund.status_code == 409


@pytest.mark.parametrize("change", ["archived", "disabled"])
def test_payment_completion_never_confirms_a_closed_registration(client, app, change):
    create_event(app, f"payment-{change}", price_cents=500)
    registration = register(client, f"payment-{change}", 10)
    checkout = client.post(
        "/api/v1/payments/checkout",
        json={
            "postSlug": f"payment-{change}",
            "registrationPublicId": registration["publicId"],
        },
        headers=API_HEADERS,
    ).get_json()
    with app.app_context():
        post = Post.query.filter_by(slug=f"payment-{change}").one()
        if change == "archived":
            post.status = "archived"
            post.is_active = False
        else:
            post.registration_limit_enabled = False
        db.session.commit()

    completed = client.post(
        f"/api/v1/payments/{checkout['publicId']}/simulate",
        json={"outcome": "success"},
        headers=API_HEADERS,
    )
    assert completed.status_code == 200
    assert completed.get_json()["status"] == "failed"
    assert client.get(f"/api/v1/public/registrations/{registration['publicId']}").get_json()["status"] != "approved"


def test_payment_completion_rechecks_reduced_capacity(client, app):
    create_event(app, "payment-capacity-change", capacity=2, price_cents=500)
    first = register(client, "payment-capacity-change", 20)
    register(client, "payment-capacity-change", 21)
    checkout = client.post(
        "/api/v1/payments/checkout",
        json={
            "postSlug": "payment-capacity-change",
            "registrationPublicId": first["publicId"],
        },
        headers=API_HEADERS,
    ).get_json()
    with app.app_context():
        Post.query.filter_by(slug="payment-capacity-change").one().registration_limit = 1
        db.session.commit()

    completed = client.post(
        f"/api/v1/payments/{checkout['publicId']}/simulate",
        json={"outcome": "success"},
        headers=API_HEADERS,
    ).get_json()
    assert completed["status"] == "failed"
    assert "capacity" in completed["errorMessage"].lower()


def test_tracking_ids_have_at_least_128_random_bits_of_source_entropy(app):
    with app.app_context():
        registration_ids = {build_event_registration_public_id() for _ in range(64)}
    karaoke_ids = {new_karaoke_public_id() for _ in range(64)}
    assert len(registration_ids) == 64
    assert len(karaoke_ids) == 64
    assert all(len(value.removeprefix("APP-")) >= 22 for value in registration_ids)
    assert all(len(value.removeprefix("KRQ-")) >= 22 for value in karaoke_ids)


def test_two_simultaneous_requests_cannot_take_the_final_place(tmp_path):
    database_path = tmp_path / "concurrency.sqlite"
    concurrent_app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{database_path}",
            "AUTO_CREATE_SCHEMA": True,
            "SEED_DEMO_DATA": False,
            "REACT_PRIMARY_FRONTEND": False,
        }
    )
    create_event(concurrent_app, "one-place")
    barrier = Barrier(2)

    def submit(index):
        client = concurrent_app.test_client()
        barrier.wait()
        response = client.post(
            "/api/v1/public/events/one-place/registrations",
            json={
                "firstName": f"Concurrent {index}",
                "lastName": "Person",
                "email": f"concurrent{index}@example.org",
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
    with concurrent_app.app_context():
        assert EventRegistration.query.filter_by(status="approved").count() == 1
        assert EventRegistration.query.filter_by(status="waiting_list").count() == 1
        db.session.remove()
        db.drop_all()


@pytest.mark.parametrize("value", ["=1+1", "+cmd", "-2", "@SUM(A1:A2)", "\tformula"])
def test_csv_formula_prefixes_are_neutralized(value):
    assert _safe_csv_cell(value) == f"'{value}"


def test_registration_csv_quotes_and_neutralizes_all_user_fields(client, app):
    post_id = create_event(app, "csv-safe")
    with app.app_context():
        db.session.add(
            EventRegistration(
                public_id="APP-CSV",
                post_id=post_id,
                first_name="=SUM(1,2)",
                last_name='Name "Quoted"',
                email="@formula.example",
                occupation="+cmd",
                diet_preference="vegetarian",
                comment="-danger\nsecond line",
                status="approved",
            )
        )
        db.session.commit()
    unlock(client, app, "registration-admin", ["event_registrations"])
    response = client.get(f"/api/v1/admin/events/{post_id}/registrations.csv")
    assert response.status_code == 200
    rows = list(csv.reader(io.StringIO(response.get_data(as_text=True))))
    assert rows[0] == [
        "application_id", "name", "email", "occupation", "diet_preference", "comment", "status"
    ]
    assert rows[1][1].startswith("'=SUM")
    assert 'Name "Quoted"' in rows[1][1]
    assert rows[1][2] == "'@formula.example"
    assert rows[1][3] == "'+cmd"
    assert rows[1][5].startswith("'-danger")
