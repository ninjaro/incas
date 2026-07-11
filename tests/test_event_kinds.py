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
