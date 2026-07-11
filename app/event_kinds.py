"""Canonical per-event-kind metadata. Single source of truth consolidating what
used to live in app/__init__.py, app/models.py, app/site_content.py, and
app/demo_seed.py. Pure data — do not import from `app` (avoids import cycles).

Weekday: Monday=0 … Sunday=6. `marker` is a semantic token mapped to a CSS
variable by the React EventIcon/EventMarker components (A3). `schedule` and the
`*Default` flags are default patterns/hints; real per-event values live on Post.
"""

EVENT_KINDS = {
    "country_evening": {
        "id": "country_evening",
        "label": {"en": "Country Evening", "de": "Länderabend"},
        "icon": "globe",
        "marker": "bad",
        "titlePrefix": {"en": "Country Evening", "de": "Länderabend"},
        "highlightTitle": True,
        "schedule": {"weekday": 1, "time": "20:00"},
        "mapMode": "country",
        "features": ["map"],
        "registrationDefault": False,
        "depositDefault": False,
    },
    "cafe_lingua": {
        "id": "cafe_lingua",
        "label": {"en": "Café Lingua", "de": "Café Lingua"},
        "icon": "chat",
        "marker": "accent",
        "titlePrefix": None,
        "highlightTitle": False,
        "schedule": {"weekday": 1, "time": "20:00"},
        "mapMode": "venue",
        "features": ["map"],
        "registrationDefault": False,
        "depositDefault": False,
    },
    "board_games": {
        "id": "board_games",
        "label": {"en": "Board Games", "de": "Brettspielabende"},
        "icon": "dice",
        "marker": "ok",
        "titlePrefix": None,
        "highlightTitle": False,
        "schedule": {"weekday": 1, "time": "20:00"},
        "mapMode": "venue",
        "features": ["map"],
        "registrationDefault": False,
        "depositDefault": False,
    },
    "karaoke": {
        "id": "karaoke",
        "label": {"en": "Karaoke", "de": "Karaoke"},
        "icon": "mic",
        "marker": "warn",
        "titlePrefix": None,
        "highlightTitle": False,
        "schedule": {"weekday": 1, "time": "20:00"},
        "mapMode": "venue",
        "features": ["karaoke_queue", "map"],
        "registrationDefault": False,
        "depositDefault": False,
    },
    "dance": {
        "id": "dance",
        "label": {"en": "Dance Workshops", "de": "Tanzworkshops"},
        "icon": "music",
        "marker": "info",
        "titlePrefix": None,
        "highlightTitle": False,
        "schedule": {"weekday": 1, "time": "20:00"},
        "mapMode": "venue",
        "features": ["map"],
        "registrationDefault": False,
        "depositDefault": False,
    },
    "breakfast": {
        "id": "breakfast",
        "label": {"en": "International Breakfast", "de": "Internationales Frühstück"},
        "icon": "egg",
        "marker": "muted",
        "titlePrefix": {"en": "International Breakfast", "de": "Internationales Frühstück"},
        "highlightTitle": True,
        "schedule": {"weekday": 5, "time": "10:00"},
        "mapMode": "venue",
        "features": ["registration", "deposit", "map"],
        "registrationDefault": True,
        "depositDefault": True,
    },
    "trip": {
        "id": "trip",
        "label": {"en": "International Weekend", "de": "Internationales Wochenende"},
        "icon": "signpost",
        "marker": "ink",
        "titlePrefix": {"en": "International Weekend", "de": "Internationales Wochenende"},
        "highlightTitle": False,
        "schedule": {"weekday": 5, "time": "09:00"},
        "mapMode": "destination",
        "features": ["registration", "map"],
        "registrationDefault": True,
        "depositDefault": False,
    },
    "housing": {
        "id": "housing",
        "label": {"en": "Housing", "de": "Wohnen"},
        "icon": "house",
        "marker": "muted",
        "titlePrefix": None,
        "highlightTitle": False,
        "schedule": None,
        "mapMode": "none",
        "features": [],
        "registrationDefault": False,
        "depositDefault": False,
    },
}


def get_event_kind(kind_id):
    return EVENT_KINDS.get(kind_id)


def event_kind_ids():
    return list(EVENT_KINDS.keys())
