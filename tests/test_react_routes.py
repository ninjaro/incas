import pytest

from app import legacy_react_target


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


def test_primary_frontend_redirect_preserves_query(client):
    response = client.get("/calendar?month=2026-07")
    assert response.status_code == 302
    assert response.headers["Location"].endswith("/app/#/calendar?month=2026-07")


def test_api_and_post_requests_are_not_redirected(client):
    assert client.get("/api/v1/public/config").status_code == 200
    response = client.post("/contact-form", data={})
    assert response.status_code != 302
