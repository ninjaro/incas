from app.event_kinds import EVENT_KINDS, event_kind_ids, get_event_kind

REQUIRED_KEYS = {
    "id", "label", "icon", "marker", "titlePrefix", "highlightTitle",
    "schedule", "mapMode", "features", "registrationDefault", "depositDefault",
}
MARKERS = {"accent", "info", "ok", "warn", "bad", "muted", "ink"}
MAP_MODES = {"none", "venue", "country", "destination"}
FEATURES = {"registration", "deposit", "map", "karaoke_queue"}


def test_registry_covers_the_eight_kinds():
    assert set(event_kind_ids()) == {
        "country_evening", "cafe_lingua", "board_games", "karaoke",
        "dance", "breakfast", "trip", "housing",
    }


def test_every_kind_has_valid_shape():
    for kind_id, kind in EVENT_KINDS.items():
        assert kind["id"] == kind_id
        assert set(kind) == REQUIRED_KEYS
        assert set(kind["label"]) == {"en", "de"}
        assert kind["marker"] in MARKERS
        assert kind["mapMode"] in MAP_MODES
        assert set(kind["features"]) <= FEATURES
        assert kind["titlePrefix"] is None or set(kind["titlePrefix"]) == {"en", "de"}
        assert kind["schedule"] is None or set(kind["schedule"]) == {"weekday", "time"}


def test_get_event_kind_unknown_returns_none():
    assert get_event_kind("does_not_exist") is None
    assert get_event_kind("breakfast")["label"]["de"] == "Internationales Frühstück"


def test_event_kind_meta_parity():
    from app import event_kind_meta

    expected = {
        "karaoke": {"label": "Karaoke", "badge": "text-bg-warning", "color": "warning"},
        "country_evening": {"label": "Country Evening", "badge": "text-bg-danger", "color": "danger"},
        "board_games": {"label": "Board Games", "badge": "text-bg-success", "color": "success"},
        "cafe_lingua": {"label": "Café Lingua", "badge": "text-bg-primary", "color": "primary"},
        "dance": {"label": "Dance Workshops", "badge": "text-bg-info", "color": "info"},
        "breakfast": {"label": "International Breakfast", "badge": "text-bg-secondary", "color": "secondary"},
        "trip": {"label": "International Weekend", "badge": "text-bg-dark", "color": "dark"},
        "housing": {"label": "Housing", "badge": "text-bg-light", "color": "secondary"},
    }
    for kind, meta in expected.items():
        assert event_kind_meta(kind) == meta, kind
    assert event_kind_meta("nope") is None


def test_title_prefix_parity():
    from app.models import EVENT_TITLE_PREFIXES, TITLE_HIGHLIGHT_KINDS

    assert EVENT_TITLE_PREFIXES == {
        "country_evening": "Country Evening",
        "breakfast": "International Breakfast",
        "trip": "International Weekend",
    }
    assert TITLE_HIGHLIGHT_KINDS == {"country_evening", "breakfast"}


def test_committed_snapshot_is_in_sync():
    import json
    import os

    from app.export_event_kinds import OUTPUT_PATH, build_event_kinds_snapshot

    assert os.path.exists(OUTPUT_PATH), "run: python -m app.export_event_kinds"
    with open(OUTPUT_PATH, encoding="utf-8") as fh:
        on_disk = json.load(fh)
    assert on_disk == build_event_kinds_snapshot(), (
        "event-kinds.generated.json is stale; run python -m app.export_event_kinds"
    )
