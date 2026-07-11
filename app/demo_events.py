"""Canonical synthetic event catalog used by backend and static-demo fixtures."""

DEMO_EVENT_SCHEMA_VERSION = 1

DEMO_PAYMENT_DEFAULTS = {
    "openingCeremony": {"capacity": 120, "priceCents": None, "isDeposit": False},
    "breakfast": {"capacity": 40, "priceCents": 200, "isDeposit": True},
    "trip": {
        "capacityMin": 60,
        "capacityMax": 120,
        "priceCentsMin": 1500,
        "priceCentsMax": 4000,
        "isDeposit": False,
    },
}

DEMO_OPENING_CEREMONY = {
    "slug": "incas-opening-ceremony",
    "title": "INCAS Opening Ceremony",
    "summary": "Meet the INCAS teams, discover the semester programme and stay for an open welcome reception.",
    "body": "The opening ceremony introduces this semester's programme and working groups. Registration is free but places are limited.",
    "event_kind": "opening_ceremony",
    "image_url": "/static/img/site/about-team.webp",
}

DEMO_TUESDAY_SPECIAL_EVENTS = [
    {
        "slug": "board-game-night",
        "title": "Board Games",
        "summary": "Easy-to-join games, mixed tables and snacks from 20:00 until around midnight.",
        "body": "Join our Tuesday evening from 20:00 for relaxed rounds of party and strategy games. New people can arrive at any time.",
        "event_kind": "board_games",
        "image_url": "/static/img/site/international-tuesday.webp",
    },
    {
        "slug": "karaoke-night",
        "title": "Karaoke Night",
        "summary": "International karaoke, group songs and open-mic energy from 20:00 onward.",
        "body": "Submit a song from this event page, join a duet or simply cheer on the room.",
        "event_kind": "karaoke",
        "image_url": "/static/img/site/international-tuesday.webp",
    },
    {
        "slug": "dance-workshops",
        "title": "Dance Workshops",
        "summary": "Beginner-friendly partner-dance basics followed by an open social floor.",
        "body": "We start with a short beginner-friendly workshop at 20:00 and keep the room open for practice afterwards.",
        "event_kind": "dance",
        "image_url": "/static/img/site/international-tuesday.webp",
    },
    {
        "slug": "international-tuesday-mixer",
        "title": "International Tuesday Mixer",
        "summary": "Conversation rounds and an easy first stop for students who are new to Aachen.",
        "body": "This Tuesday evening combines simple mixer activities and open tables from 20:00 until around midnight.",
        "event_kind": "international_tuesday",
        "image_url": "/static/img/site/international-tuesday.webp",
    },
]

DEMO_COUNTRY_EVENING_THEMES = [
    ("Spain", "Tapas stories, regional playlists and a short culture quiz."),
    ("Japan", "Festivals, daily life and student tips between cities and campus."),
    ("Brazil", "Music, language basics and stories from local celebrations."),
    ("Turkey", "Tea, food traditions and city life from different regions."),
    ("Italy", "Regional food, travel routes and a guide to everyday phrases."),
    ("Mexico", "Street food, celebrations and photo impressions from home."),
    ("Poland", "Music, comfort food and snapshots of student life."),
]

DEMO_BREAKFAST_THEMES = [
    ("Turkey", "Menemen, breads, spreads and plenty of tea."),
    ("North American culture", "Sweet breakfast classics with coffee and fruit."),
    ("Latin American culture", "Warm dishes, juices and a relaxed Saturday start."),
    ("European culture", "Fresh rolls, cheese, jam and easy conversation."),
    ("Belgium", "Homemade waffles, toppings and coffee refills."),
    ("Around the World", "A mixed buffet with dishes from several countries."),
    ("Arab culture", "Light breakfast plates, dates and seasonal fruit."),
]

DEMO_TRIP_DESTINATIONS = [
    ("Maastricht, Netherlands", "Old-town walk, riverside break and time in the centre."),
    ("Cologne, Germany", "Train trip, museum stop and time for food in the city."),
    ("Mons, Belgium", "Architecture walk, coffee stop and small-group exploring."),
    ("Bonn, Germany", "Museum Mile options and a long walk by the Rhine."),
    ("Liège, Belgium", "Local snacks, markets and an easy day schedule."),
    ("Drachenfels, Germany", "A beginner-friendly outing with views and a group picnic."),
    ("Luxembourg City, Luxembourg", "Viewpoints, cafés and an evening return."),
]


def build_demo_event_catalog():
    return {
        "schemaVersion": DEMO_EVENT_SCHEMA_VERSION,
        "timezone": "Europe/Berlin",
        "rules": {
            "monthsBefore": 3,
            "monthsAfter": 3,
            "tuesdayWeekday": 1,
            "saturdayWeekday": 5,
            "breakfastSaturdayIndex": 0,
            "tripSaturdayIndex": 2,
        },
        "tuesdaySpecials": DEMO_TUESDAY_SPECIAL_EVENTS,
        "openingCeremony": DEMO_OPENING_CEREMONY,
        "countryEvenings": [
            {"label": label, "description": description}
            for label, description in DEMO_COUNTRY_EVENING_THEMES
        ],
        "breakfasts": [
            {"label": label, "description": description}
            for label, description in DEMO_BREAKFAST_THEMES
        ],
        "trips": [
            {"label": label, "description": description}
            for label, description in DEMO_TRIP_DESTINATIONS
        ],
        "paymentDefaults": DEMO_PAYMENT_DEFAULTS,
    }
