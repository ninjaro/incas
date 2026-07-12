import re

from app import is_canonical_react_path, legacy_react_target
from app.site_content import SITE_PAGES, SITE_UI


def test_public_ui_locales_have_identical_keys():
    assert set(SITE_UI["en"]) == set(SITE_UI["de"])


def test_authored_internal_links_resolve_to_react_or_a_compatibility_redirect():
    for localized_pages in SITE_PAGES.values():
        for page in localized_pages.values():
            for href in re.findall(r'href=["\']([^"\']+)', page.get("body_html", "")):
                if not href.startswith("/") or href.startswith("//"):
                    continue
                path = href.split("?", 1)[0].split("#", 1)[0]
                assert is_canonical_react_path(path) or legacy_react_target(path), href


def test_public_site_en(client):
    payload = client.get("/api/v1/public/site?locale=en").get_json()
    assert payload["locale"] == "en"
    assert payload["strings"]["nav.home"] == "Home"
    labels = [item["label"] for item in payload["nav"]]
    assert "Home" in labels and "About Us" in labels
    about = next(item for item in payload["nav"] if item["label"] == "About Us")
    assert {c["to"] for c in about["children"]} == {
        "/about", "/about/working-groups", "/about/team-meetings", "/about/team"
    }
    # No nav/offers/footer link points at a legacy Flask path.
    urls = [i.get("to") for i in payload["nav"]]
    urls += [p["to"] for p in payload["offers"]["pages"]]
    urls += [f["to"] for f in payload["offers"]["forms"]]
    urls += [l["to"] for l in payload["footer"]["offerLinks"]]
    for u in urls:
        assert u is None or not u.startswith("/language-tandem")
        assert u is None or not u.startswith("/contact-form")
        assert u is None or "/suggest-event" not in u or u.startswith("/suggest-event")
    platforms = {s["platform"]: s["url"] for s in payload["footer"]["social"]}
    assert platforms["facebook"] == "https://www.facebook.com/INCASAachen/"
    assert platforms["instagram"] == "https://www.instagram.com/incas_aachen/"
    assert platforms["youtube"] is None


def test_public_site_de_localizes(client):
    payload = client.get("/api/v1/public/site?locale=de").get_json()
    assert payload["locale"] == "de"
    assert payload["strings"]["nav.home"] == "Start"
    assert "migriert" not in payload["strings"]["contact.intro"].lower()


def test_api_responses_include_security_headers(client):
    response = client.get("/api/v1/public/site?locale=de")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    policy = response.headers["Content-Security-Policy"]
    assert "script-src 'self'" in policy
    assert "https://tile.openstreetmap.org" in policy
    assert "cdn.jsdelivr.net" not in policy
    assert "cdn.amcharts.com" not in policy
    assert "object-src 'none'" in policy


def test_public_site_invalid_locale_falls_back_to_en(client):
    payload = client.get("/api/v1/public/site?locale=xx").get_json()
    assert payload["locale"] == "en"


def test_public_content_about_en(client):
    payload = client.get("/api/v1/public/content/about?locale=en").get_json()
    assert payload["slug"] == "about"
    assert payload["title"] == "About us"
    assert "INtercultural" in payload["bodyHtml"] or "IN" in payload["bodyHtml"]


def test_public_content_hyphen_slug(client):
    payload = client.get("/api/v1/public/content/working-groups?locale=en").get_json()
    assert payload["slug"] == "working-groups"
    assert "work group" in payload["bodyHtml"].lower()


def test_public_content_de(client):
    en = client.get("/api/v1/public/content/about?locale=en").get_json()
    de = client.get("/api/v1/public/content/about?locale=de").get_json()
    assert en["bodyHtml"] != de["bodyHtml"]


def test_public_content_unknown_slug_404(client):
    response = client.get("/api/v1/public/content/nope?locale=en")
    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "not_found"
