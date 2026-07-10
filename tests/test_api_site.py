def test_public_site_en(client):
    payload = client.get("/api/v1/public/site?locale=en").get_json()
    assert payload["locale"] == "en"
    assert payload["strings"]["nav.home"] == "Home"
    labels = [item["label"] for item in payload["nav"]]
    assert "Home" in labels and "About Us" in labels
    about = next(item for item in payload["nav"] if item["label"] == "About Us")
    assert {c["to"] for c in about["children"]} == {
        "/about", "/about/working-groups", "/about/team-meetings"
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


def test_public_site_invalid_locale_falls_back_to_en(client):
    payload = client.get("/api/v1/public/site?locale=xx").get_json()
    assert payload["locale"] == "en"
