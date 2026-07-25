from datetime import timedelta

from app.datetime_utils import serialize_utc, utc_now
from tests.conftest import API_HEADERS, unlock


def test_session_lock_clears_capabilities_and_reports_key_expiry(client, app):
    unlock(client, app, "access-root", ["access_keys"])
    created = client.post(
        "/api/v1/admin/access-keys",
        json={
            "label": "Short forms access",
            "scopes": ["forms"],
            "expiresAt": serialize_utc(utc_now() + timedelta(hours=2)),
        },
        headers=API_HEADERS,
    ).get_json()

    activated = client.post(
        "/api/v1/access/unlock",
        json={"key": created["secret"]},
        headers=API_HEADERS,
    ).get_json()
    assert "forms" in activated["capabilities"]
    assert activated["nextExpiryAt"] == created["expiresAt"]

    locked = client.post("/api/v1/access/lock", headers=API_HEADERS)
    assert locked.status_code == 200
    assert locked.get_json()["capabilities"] == []
    assert locked.get_json()["nextExpiryAt"] is None
    assert locked.get_json()["hasAccessKeys"] is True


def test_post_preview_uses_public_rich_html_sanitizer(client, app):
    unlock(client, app, "posts-key", ["posts"])
    response = client.post(
        "/api/v1/admin/posts/preview",
        json={
            "body": '<h2>Welcome</h2><script>alert(1)</script><a href="javascript:alert(2)">bad</a><strong>safe</strong>'
        },
        headers=API_HEADERS,
    )
    assert response.status_code == 200
    body_html = response.get_json()["bodyHtml"]
    assert body_html == "<h2>Welcome</h2><a>bad</a><strong>safe</strong>"


def test_template_reuses_registration_image_and_social_defaults(client, app):
    unlock(client, app, "posts-key", ["posts"])
    created = client.post(
        "/api/v1/admin/post-templates",
        json={
            "name": "Breakfast queue",
            "titlePattern": "International Breakfast: Example",
            "summary": "Breakfast summary",
            "body": "<p>Breakfast body</p>",
            "eventKind": "breakfast",
            "registrationLimitEnabled": True,
            "registrationLimit": 40,
            "registrationPriceCents": 200,
            "registrationIsDeposit": True,
            "registrationMode": "queue",
            "depositExplanation": "Returned at check-in.",
            "imageUrl": "/static/img/incas-icon.png",
            "socialSettings": {"facebook": True, "instagram": False},
        },
        headers=API_HEADERS,
    )
    assert created.status_code == 201
    template = created.get_json()
    assert template["registrationMode"] == "queue"
    assert template["depositExplanation"] == "Returned at check-in."

    post_response = client.post(
        "/api/v1/admin/posts/from-template",
        json={"templateId": template["id"]},
        headers=API_HEADERS,
    )
    assert post_response.status_code == 201
    post = post_response.get_json()
    assert post["registrationLimitEnabled"] is True
    assert post["registrationLimit"] == 40
    assert post["registrationPriceCents"] == 200
    assert post["registrationIsDeposit"] is True
    assert post["registrationMode"] == "queue"
    assert post["depositExplanation"] == "Returned at check-in."
    assert post["imageUrl"] == "/static/img/incas-icon.png"
    assert post["templateSocialSettings"] == {"facebook": True, "instagram": False}
