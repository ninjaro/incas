import re

from app import is_canonical_react_path, legacy_react_target
from app.event_kinds import EVENT_KINDS
from app.site_content import SITE_PAGES, SITE_UI, SITE_OFFERS


def test_public_ui_locales_have_identical_keys():
    assert set(SITE_UI["en"]) == set(SITE_UI["de"])


def test_public_content_has_sections_image_metadata_and_one_offers_source():
    assert "offers" not in SITE_PAGES["en"]
    assert set(SITE_PAGES["en"]) == set(SITE_PAGES["de"])
    for locale, pages in SITE_PAGES.items():
        for key, page in pages.items():
            assert page["section"] in {"about", "offers", "legal"}, (locale, key)
            if page.get("image"):
                assert page["image_alt"], (locale, key)
                assert page["image_width"] > 0
                assert page["image_height"] > 0
    for locale, catalog in SITE_OFFERS.items():
        assert len(catalog["pages"]) == 9
        for offer in catalog["pages"]:
            if offer.get("event_kind"):
                assert offer["event_kind"] in EVENT_KINDS, (locale, offer["title"])


def test_public_shared_css_classes_have_global_contracts():
    with open("frontend/src/styles/global.css", encoding="utf-8") as css:
        source = css.read()
    assert "\n.page-kicker {" in source
    assert ".offers-page .offers-grid" in source
    assert ".offers-page .offers-card" in source
    assert ".content-page-image" in source


def test_volatile_event_copy_does_not_contradict_structured_data():
    for locale in ("en", "de"):
        working_groups = SITE_PAGES[locale]["working_groups"]["body_html"].lower()
        trip = SITE_PAGES[locale]["international_weekend"]["body_html"].lower()
        tuesday = SITE_PAGES[locale]["international_tuesday"]["body_html"].lower()
        assert "last sunday" not in working_groups
        assert "letzten sonntag" not in working_groups
        assert "10-25 eur" not in trip and "5-15 eur" not in trip
        assert "every tuesday from" not in tuesday
        assert "jeden dienstag ab" not in tuesday


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
    assert about == {"label": "About Us", "to": "/about", "section": "about"}
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
    assert payload["section"] == "about"
    assert payload["imageAlt"]
    assert payload["imageWidth"] == 1600
    assert payload["imageHeight"] == 1200


def test_public_content_rejects_cross_section_slugs(client):
    assert client.get("/api/v1/public/content/about?locale=en&section=offers").status_code == 404
    assert client.get("/api/v1/public/content/international-weekend?locale=en&section=about").status_code == 404
    assert client.get("/api/v1/public/content/international-weekend?locale=en&section=offers").status_code == 200
    assert client.get("/api/v1/public/content/offers?locale=en&section=offers").status_code == 404


def test_authored_faq_is_static_and_semantically_expanded(client):
    html = client.get("/api/v1/public/content/international-weekend?locale=en&section=offers").get_json()["bodyHtml"]
    assert "accordion-question" in html
    assert "accordion-answer" in html
    assert "accordion-button" not in html
    assert "data-bs-" not in html
    assert "aria-expanded" not in html


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
