import pytest

from app import create_app, is_canonical_react_path, legacy_react_target
from app.models import Post, db, get_configured_local_now


@pytest.mark.parametrize(
    ("legacy", "react"),
    [
        ("/", "/"),
        ("/events", "/calendar"),
        ("/calendar", "/calendar"),
        ("/content/country-evening-poland", "/events/country-evening-poland"),
        ("/events/country-evening-poland", "/events/country-evening-poland"),
        ("/offers/language-tandem", "/offers/language-tandem"),
        ("/contact-form", "/contact"),
        ("/contacts", "/contact"),
        ("/suggest-event", "/suggest-event"),
        ("/language-tandem", "/tandem"),
        ("/team", "/about?section=team"),
        ("/event-registrations/EVT-123", "/registrations/EVT-123"),
        ("/admin/forms", "/admin/forms"),
        ("/admin/event-registrations/4", "/admin/registrations"),
    ],
)
def test_legacy_route_matrix(legacy, react):
    assert legacy_react_target(legacy) == react


def spa_app(tmp_path):
    index_path = tmp_path / "index.html"
    index_path.write_text(
        """<!doctype html><html><head>
        <title>Default</title>
        <meta name="description" content="Default" />
        <meta property="og:title" content="Default" />
        <meta property="og:description" content="Default" />
        <meta property="og:image" content="/default.svg" />
        <meta property="og:url" content="/" />
        <link rel="canonical" href="/" />
        </head><body><div id="root"></div></body></html>""",
        encoding="utf-8",
    )
    return create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite://",
            "AUTO_CREATE_SCHEMA": True,
            "SEED_DEMO_DATA": False,
            "REACT_PRIMARY_FRONTEND": True,
            "SPA_INDEX_PATH": str(index_path),
        }
    )


def test_primary_frontend_uses_stable_urls_and_legacy_redirects(tmp_path):
    app = spa_app(tmp_path)
    client = app.test_client()
    response = client.get("/calendar?month=2026-07")
    assert response.status_code == 200
    assert '<link rel="canonical" href="http://localhost/calendar"' in response.get_data(as_text=True)

    legacy = client.get("/events?month=2026-07")
    assert legacy.status_code == 308
    assert legacy.headers["Location"].endswith("/calendar?month=2026-07")
    assert client.get("/app").headers["Location"] == "/"

    with app.app_context():
        db.drop_all()


def test_event_route_injects_escaped_social_metadata_and_private_routes_are_noindex(tmp_path):
    app = spa_app(tmp_path)
    with app.app_context():
        db.session.add(
            Post(
                slug="safe-event",
                title="Country Evening: Poland",
                summary='Meet us \\1 & <friends> "today".',
                status="published",
                is_active=True,
                starts_at=get_configured_local_now(),
                image_url="/static/img/event.webp",
            )
        )
        db.session.commit()
    client = app.test_client()
    response = client.get("/events/safe-event")
    html = response.get_data(as_text=True)
    assert response.status_code == 200
    assert "Country Evening: Poland | INCAS" in html
    assert "&lt;friends&gt;" in html
    assert '<meta property="og:image" content="http://localhost/static/img/event.webp"' in html
    assert '<link rel="canonical" href="http://localhost/events/safe-event"' in html
    assert "<friends>" not in html
    assert 'name="robots"' not in html
    assert 'content="noindex,nofollow"' in client.get("/admin").get_data(as_text=True)
    assert 'content="noindex,nofollow"' in client.get("/registrations/APP-test").get_data(as_text=True)

    with app.app_context():
        db.drop_all()


@pytest.mark.parametrize(
    "path",
    [
        "/", "/calendar", "/events/example", "/offers", "/offers/board-games",
        "/about", "/contact", "/suggest-event", "/tandem",
        "/registrations/APP-example", "/admin", "/admin/posts",
    ],
)
def test_canonical_route_crawl(path):
    assert is_canonical_react_path(path)


def test_api_and_post_requests_are_not_redirected(client):
    assert client.get("/api/v1/public/config").status_code == 200
    response = client.post("/contact-form", data={})
    assert response.status_code != 302
