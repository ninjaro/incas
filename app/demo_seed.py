import calendar
import json
import random
from datetime import datetime, time, timedelta

from app.models import LanguageTandemRequest, Post, db, get_configured_local_now

DEMO_FIRST_NAMES = [
    "Anna", "Mariam", "Luca", "Noah", "Sofia", "Elena", "Yuki", "Omar",
    "Marta", "David", "Nina", "Ali", "Sara", "Jonas", "Leila", "Ivan",
]

DEMO_LAST_NAMES = [
    "Meyer", "Khan", "Rossi", "Schmidt", "Garcia", "Silva", "Kim", "Dubois",
    "Petrov", "Novak", "Costa", "Singh", "Tanaka", "Yilmaz", "Smirnova", "Brown",
]

DEMO_OCCUPATIONS = [
    "Student at RWTH Aachen",
    "Student at FH Aachen",
]

DEMO_GENDERS = [
    "Female",
    "Male",
    "Divers",
]

DEMO_COUNTRY_LANGUAGES = {
    "DE": ["de"],
    "FR": ["fr"],
    "IT": ["it"],
    "ES": ["es"],
    "TR": ["tr"],
    "PL": ["pl"],
    "UA": ["uk", "ru"],
    "IN": ["hi", "en"],
    "CN": ["zh"],
    "JP": ["ja"],
    "GB": ["en"],
    "US": ["en"],
    "NL": ["nl", "en"],
}

DEMO_LANGUAGE_POOL = [
    "de",
    "en",
    "fr",
    "es",
    "it",
    "tr",
    "pl",
    "uk",
    "ru",
    "hi",
    "zh",
    "ja",
    "nl",
    "pt",
    "ar",
]

DEMO_COMMENTS = [
    "",
    "",
    "",
    "I prefer evening meetings.",
    "I am available on weekdays after classes.",
    "I would like to practice conversation regularly.",
    "I am looking for a tandem partner for casual speaking practice.",
    "I am open to online or in-person meetings.",
]

DEMO_LANGUAGE_LEVELS = {"1", "2", "3", "4", "5"}
DEMO_EVENT_MONTHS_BEFORE = 3
DEMO_EVENT_MONTHS_AFTER = 3

DEMO_TUESDAY_SPECIAL_EVENTS = [
    {
        "slug": "board-game-tuesday",
        "title": "Board Game",
        "summary": "Easy-to-join games, mixed tables and snacks from 20:00 until around midnight.",
        "body": "Join our Tuesday evening from 20:00 for relaxed rounds of party games and strategy games. New people can drop in at any time and usually stay until around midnight.",
        "event_kind": "board_games",
        "image_url": "/static/img/site/international-tuesday.webp",
    },
    {
        "slug": "karaoke-night",
        "title": "Karaoke Night",
        "summary": "International karaoke, group songs and open mic energy from 20:00 onward.",
        "body": "Our Tuesday karaoke evening starts at 20:00 and usually runs until around midnight. Bring a song, join a duet or just cheer on the room.",
        "event_kind": "karaoke",
        "image_url": "/static/img/site/international-tuesday.webp",
    },
    {
        "slug": "dance-social",
        "title": "Dance Workshops",
        "summary": "Simple partner-dance basics, playlist requests and a social floor until late.",
        "body": "We start with a short beginner-friendly dance warm-up at 20:00 and keep the room open as a social until around midnight.",
        "event_kind": "dance",
        "image_url": "/static/img/site/international-tuesday.webp",
    },
    {
        "slug": "games-and-mixer",
        "title": "Games & Mixer Night",
        "summary": "Conversation rounds, team games and an easy first stop for new students.",
        "body": "This Tuesday evening combines simple mixer games and open tables from 20:00 until around midnight, making it easy to meet people even if you come alone.",
        "event_kind": "board_games",
        "image_url": "/static/img/site/international-tuesday.webp",
    },
]

DEMO_COUNTRY_EVENING_THEMES = [
    ("Spain", "Tapas stories, regional playlists and a short culture quiz."),
    ("Japan", "Festivals, daily life and student tips between cities and campus."),
    ("Brazil", "Music, language basics and stories from local celebrations."),
    ("Turkey", "Tea, food traditions and city life from different regions."),
    ("Italy", "Regional food, travel routes and a quick guide to everyday phrases."),
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
    ("Maastricht, Netherlands", "Old town walk, riverside break and a relaxed afternoon in the center."),
    ("Cologne, Germany", "Train trip, museum stop and time for food in the city."),
    ("Mons, Belgium", "Architecture walk, coffee stop and small-group exploring."),
    ("Bonn, Germany", "Museum mile options and a long walk by the Rhine."),
    ("Liège, Belgium", "Local snacks, markets and an easy day schedule."),
    ("Drachenfels, Germany", "A beginner-friendly outing with views and a group picnic."),
    ("Luxembourg City, Luxembourg", "A full Saturday with viewpoints, cafés and an evening return."),
]

def build_demo_offered_language_levels(country_code, offered_languages):
    native_languages = set(DEMO_COUNTRY_LANGUAGES.get(country_code, []))
    levels = {}

    for code in offered_languages:
        if code in native_languages:
            levels[code] = "5"
        elif code == "en":
            levels[code] = random.choice(["3", "4"])
        else:
            levels[code] = random.choice(["2", "3", "4"])

    return levels

def normalize_demo_offered_language_levels(country_code, offered_languages, offered_language_levels=None):
    native_languages = set(DEMO_COUNTRY_LANGUAGES.get(country_code, []))
    offered_language_levels = offered_language_levels or {}
    levels = {}

    for code in offered_languages:
        raw_level = str(offered_language_levels.get(code, "")).strip()
        if raw_level in DEMO_LANGUAGE_LEVELS:
            levels[code] = raw_level
        elif code in native_languages:
            levels[code] = "5"
        elif code == "en":
            levels[code] = "4"
        else:
            levels[code] = "3"

    return levels

def create_demo_tandem_request(
    *,
    first_name,
    last_name,
    email,
    occupation,
    gender,
    birth_year,
    departure_date,
    country_of_origin,
    offered_languages,
    offered_language_levels=None,
    requested_languages,
    requested_native_only=False,
    same_gender_only=False,
    comment="",
    is_viewed=False,
    created_at=None,
):
    created_at = created_at or datetime.utcnow()
    offered_language_levels = normalize_demo_offered_language_levels(
        country_of_origin,
        offered_languages,
        offered_language_levels=offered_language_levels,
    )
    offered_native_languages = [
        code for code in offered_languages
        if offered_language_levels.get(code) == "5"
    ]

    return LanguageTandemRequest(
        first_name=first_name,
        last_name=last_name,
        email=email,
        occupation=occupation,
        gender=gender,
        birth_year=birth_year,
        departure_date=departure_date,
        country_of_origin=country_of_origin,
        offered_languages=json.dumps(offered_languages),
        offered_native_languages=json.dumps(offered_native_languages),
        offered_language_levels=json.dumps(offered_language_levels),
        requested_languages=json.dumps(requested_languages),
        requested_native_only=requested_native_only,
        same_gender_only=same_gender_only,
        comment=comment,
        is_viewed=is_viewed,
        created_at=created_at,
        updated_at=created_at,
    )

def add_demo_request_pair(
    items,
    *,
    base_created_at,
    first_name,
    last_name,
    email,
    occupation,
    gender,
    birth_year,
    departure_date,
    country_of_origin,
    offered_languages,
    offered_language_levels=None,
    requested_languages,
    requested_native_only=False,
    same_gender_only=False,
    comment="",
    second_created_at_offset_minutes=20,
    second_email=None,
    second_first_name=None,
    second_last_name=None,
    second_offered_languages=None,
    second_offered_language_levels=None,
    second_requested_languages=None,
    second_requested_native_only=None,
    second_same_gender_only=None,
    second_comment=None,
    second_departure_date=None,
):
    items.append(
        create_demo_tandem_request(
            first_name=first_name,
            last_name=last_name,
            email=email,
            occupation=occupation,
            gender=gender,
            birth_year=birth_year,
            departure_date=departure_date,
            country_of_origin=country_of_origin,
            offered_languages=offered_languages,
            offered_language_levels=offered_language_levels,
            requested_languages=requested_languages,
            requested_native_only=requested_native_only,
            same_gender_only=same_gender_only,
            comment=comment,
            is_viewed=False,
            created_at=base_created_at,
        )
    )

    items.append(
        create_demo_tandem_request(
            first_name=second_first_name or first_name,
            last_name=second_last_name or last_name,
            email=second_email or email,
            occupation=occupation,
            gender=gender,
            birth_year=birth_year,
            departure_date=second_departure_date or departure_date,
            country_of_origin=country_of_origin,
            offered_languages=second_offered_languages or offered_languages,
            offered_language_levels=second_offered_language_levels or offered_language_levels,
            requested_languages=second_requested_languages or requested_languages,
            requested_native_only=(
                requested_native_only
                if second_requested_native_only is None
                else second_requested_native_only
            ),
            same_gender_only=(
                same_gender_only
                if second_same_gender_only is None
                else second_same_gender_only
            ),
            comment=comment if second_comment is None else second_comment,
            is_viewed=True,
            created_at=base_created_at + timedelta(minutes=second_created_at_offset_minutes),
        )
    )

def build_structured_tandem_demo_requests(now):
    examples = [
        {
            "first_name": "Anna",
            "last_name": "Meyer",
            "email": "anna.meyer@example.com",
            "occupation": "Student at RWTH Aachen",
            "gender": "Female",
            "birth_year": 2001,
            "departure_date": (now + timedelta(days=120)).date(),
            "country_of_origin": "DE",
            "offered_languages": ["de", "en"],
            "offered_language_levels": {"de": "5", "en": "4"},
            "requested_languages": ["es"],
            "comment": "Strong example: native German for Spanish practice.",
            "is_viewed": False,
            "created_at": now - timedelta(days=1, hours=2),
        },
        {
            "first_name": "Lucia",
            "last_name": "Garcia",
            "email": "lucia.garcia@example.com",
            "occupation": "Student at FH Aachen",
            "gender": "Female",
            "birth_year": 2000,
            "departure_date": (now + timedelta(days=118)).date(),
            "country_of_origin": "ES",
            "offered_languages": ["es", "de"],
            "offered_language_levels": {"es": "5", "de": "2"},
            "requested_languages": ["de"],
            "comment": "Full match with Anna: native Spanish, wants German.",
            "is_viewed": False,
            "created_at": now - timedelta(days=1, hours=1, minutes=20),
        },
        {
            "first_name": "Diego",
            "last_name": "Alvarez",
            "email": "diego.alvarez@example.com",
            "occupation": "Student at RWTH Aachen",
            "gender": "Male",
            "birth_year": 1999,
            "departure_date": (now + timedelta(days=125)).date(),
            "country_of_origin": "ES",
            "offered_languages": ["es", "en"],
            "offered_language_levels": {"es": "2", "en": "3"},
            "requested_languages": ["de"],
            "comment": "Partial example: Spanish is intermediate, so the score should be lower.",
            "is_viewed": False,
            "created_at": now - timedelta(days=2, hours=3),
        },
        {
            "first_name": "Paula",
            "last_name": "Martin",
            "email": "paula.martin@example.com",
            "occupation": "Student at FH Aachen",
            "gender": "Female",
            "birth_year": 2002,
            "departure_date": (now + timedelta(days=128)).date(),
            "country_of_origin": "ES",
            "offered_languages": ["es", "en"],
            "offered_language_levels": {"es": "1", "en": "4"},
            "requested_languages": ["en"],
            "comment": "Weak example for Spanish seekers: Spanish is only beginner.",
            "is_viewed": True,
            "created_at": now - timedelta(days=2, hours=1),
        },
        {
            "first_name": "Claire",
            "last_name": "Dubois",
            "email": "claire.dubois@example.com",
            "occupation": "Student at RWTH Aachen",
            "gender": "Female",
            "birth_year": 2001,
            "departure_date": (now + timedelta(days=95)).date(),
            "country_of_origin": "FR",
            "offered_languages": ["fr", "en"],
            "offered_language_levels": {"fr": "5", "en": "3"},
            "requested_languages": ["de"],
            "comment": "Full French/German exchange candidate.",
            "is_viewed": False,
            "created_at": now - timedelta(days=3, hours=5),
        },
        {
            "first_name": "Jonas",
            "last_name": "Schmidt",
            "email": "jonas.schmidt@example.com",
            "occupation": "Student at FH Aachen",
            "gender": "Male",
            "birth_year": 1998,
            "departure_date": (now + timedelta(days=98)).date(),
            "country_of_origin": "DE",
            "offered_languages": ["de", "fr"],
            "offered_language_levels": {"de": "5", "fr": "2"},
            "requested_languages": ["fr"],
            "comment": "Good match with Claire, but his French offer is only intermediate.",
            "is_viewed": True,
            "created_at": now - timedelta(days=3, hours=3),
        },
        {
            "first_name": "Mei",
            "last_name": "Chen",
            "email": "mei.chen@example.com",
            "occupation": "Student at RWTH Aachen",
            "gender": "Female",
            "birth_year": 2003,
            "departure_date": (now + timedelta(days=75)).date(),
            "country_of_origin": "CN",
            "offered_languages": ["zh", "en"],
            "offered_language_levels": {"zh": "5", "en": "4"},
            "requested_languages": ["de"],
            "comment": "One-way example: wants German and offers native Chinese.",
            "is_viewed": False,
            "created_at": now - timedelta(days=4, hours=2),
        },
        {
            "first_name": "Noah",
            "last_name": "Brown",
            "email": "noah.brown@example.com",
            "occupation": "Student at FH Aachen",
            "gender": "Male",
            "birth_year": 1997,
            "departure_date": (now + timedelta(days=82)).date(),
            "country_of_origin": "US",
            "offered_languages": ["en", "de"],
            "offered_language_levels": {"en": "5", "de": "3"},
            "requested_languages": ["zh"],
            "comment": "Reverse exchange with Mei, but German is advanced, not native.",
            "is_viewed": True,
            "created_at": now - timedelta(days=4, hours=1),
        },
        {
            "first_name": "Omar",
            "last_name": "Khan",
            "email": "omar.khan@example.com",
            "occupation": "Student at FH Aachen",
            "gender": "Male",
            "birth_year": 1998,
            "departure_date": (now + timedelta(days=90)).date(),
            "country_of_origin": "IN",
            "offered_languages": ["hi", "en", "de"],
            "offered_language_levels": {"hi": "5", "en": "4", "de": "2"},
            "requested_languages": ["de"],
            "requested_native_only": True,
            "comment": "Native-only request: non-native German offers should be capped.",
            "is_viewed": False,
            "created_at": now - timedelta(days=5, hours=2),
        },
        {
            "first_name": "Luca",
            "last_name": "Rossi",
            "email": "luca.rossi@example.com",
            "occupation": "Student at RWTH Aachen",
            "gender": "Male",
            "birth_year": 2000,
            "departure_date": (now + timedelta(days=150)).date(),
            "country_of_origin": "IT",
            "offered_languages": ["it", "en"],
            "offered_language_levels": {"it": "5", "en": "4"},
            "requested_languages": ["de", "es"],
            "requested_native_only": True,
            "comment": "Multiple requested languages and native-speaker preference.",
            "is_viewed": True,
            "created_at": now - timedelta(days=6, hours=6),
        },
        {
            "first_name": "Yuki",
            "last_name": "Tanaka",
            "email": "yuki.tanaka@example.com",
            "occupation": "Student at FH Aachen",
            "gender": "Non-binary / Diverse",
            "birth_year": 2002,
            "departure_date": (now + timedelta(days=165)).date(),
            "country_of_origin": "JP",
            "offered_languages": ["ja", "en"],
            "offered_language_levels": {"ja": "5", "en": "2"},
            "requested_languages": ["de"],
            "comment": "One-way Japanese/German example with a later departure date.",
            "is_viewed": False,
            "created_at": now - timedelta(days=7, hours=4),
        },
    ]

    items = [create_demo_tandem_request(**example) for example in examples]

    add_demo_request_pair(
        items,
        base_created_at=now - timedelta(days=8, hours=2),
        first_name="Sara",
        last_name="Petrova",
        email="sara.petrova@example.com",
        occupation="Student at RWTH Aachen",
        gender="Female",
        birth_year=2002,
        departure_date=(now + timedelta(days=80)).date(),
        country_of_origin="UA",
        offered_languages=["uk", "en"],
        offered_language_levels={"uk": "5", "en": "4"},
        requested_languages=["de"],
        same_gender_only=True,
        comment="Duplicate review example: same request with a typo.",
        second_email="sara.petrovva@example.com",
        second_last_name="Petrovva",
        second_requested_languages=["de"],
        second_offered_language_levels={"uk": "5", "en": "4"},
        second_comment="Resubmitted after email typo.",
    )

    add_demo_request_pair(
        items,
        base_created_at=now - timedelta(days=9, hours=1),
        first_name="Mariam",
        last_name="Yilmaz",
        email="mariam.yilmaz@example.com",
        occupation="Student at FH Aachen",
        gender="Female",
        birth_year=1999,
        departure_date=(now + timedelta(days=110)).date(),
        country_of_origin="TR",
        offered_languages=["tr", "en", "de"],
        offered_language_levels={"tr": "5", "en": "3", "de": "2"},
        requested_languages=["de"],
        comment="Likely duplicate example with a small name change.",
        second_email="mariam.yilmaz+2@example.com",
        second_last_name="Ylmaz",
        second_offered_language_levels={"tr": "5", "en": "3", "de": "2"},
        second_comment="Morning meetings are better for me.",
    )

    return items

def build_random_demo_tandem_request(now, index):
    country_codes = list(DEMO_COUNTRY_LANGUAGES.keys())

    first_name = random.choice(DEMO_FIRST_NAMES)
    last_name = random.choice(DEMO_LAST_NAMES)
    country_code = random.choice(country_codes)

    offered_languages = build_demo_offered_languages(country_code)
    offered_language_levels = build_demo_offered_language_levels(country_code, offered_languages)
    requested_languages = build_demo_requested_languages(offered_languages)

    created_at = now - timedelta(
        days=random.randint(0, 45),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )

    departure_date = (created_at + timedelta(days=random.randint(20, 240))).date()

    return create_demo_tandem_request(
        first_name=first_name,
        last_name=last_name,
        email=f"{first_name}.{last_name}.{index}@example.com".lower(),
        occupation=random.choice(DEMO_OCCUPATIONS),
        gender=random.choice(DEMO_GENDERS),
        birth_year=random.randint(1990, 2006),
        departure_date=departure_date,
        country_of_origin=country_code,
        offered_languages=offered_languages,
        offered_language_levels=offered_language_levels,
        requested_languages=requested_languages,
        requested_native_only=random.random() < 0.35,
        same_gender_only=random.random() < 0.20,
        comment=random.choice(DEMO_COMMENTS),
        is_viewed=random.random() < 0.60,
        created_at=created_at,
    )

def iter_demo_months(anchor_date, months_before=DEMO_EVENT_MONTHS_BEFORE, months_after=DEMO_EVENT_MONTHS_AFTER):
    anchor_month_index = anchor_date.year * 12 + (anchor_date.month - 1)

    for offset in range(-months_before, months_after + 1):
        month_index = anchor_month_index + offset
        year = month_index // 12
        month = month_index % 12 + 1
        yield year, month

def month_weekdays(year, month, weekday):
    month_calendar = calendar.Calendar(firstweekday=0)
    return [
        day
        for week in month_calendar.monthdatescalendar(year, month)
        for day in week
        if day.month == month and day.weekday() == weekday
    ]

def create_demo_post(
    *,
    slug,
    title,
    summary="",
    body,
    starts_at=None,
    is_active=True,
    is_pinned=False,
    event_kind=None,
    image_url="",
    registration_limit_enabled=False,
    registration_limit=None,
    registration_price_cents=None,
    registration_is_deposit=False,
):
    return Post(
        slug=slug,
        title=title,
        summary=summary,
        body=body,
        starts_at=starts_at,
        is_active=is_active,
        is_pinned=is_pinned,
        event_kind=event_kind,
        image_url=image_url,
        registration_limit_enabled=registration_limit_enabled,
        registration_limit=registration_limit,
        registration_price_cents=registration_price_cents,
        registration_is_deposit=registration_is_deposit,
    )

def create_dated_demo_event(template, event_date, starts_at_time):
    return create_demo_post(
        slug=f"{template['slug']}-{event_date.isoformat()}",
        title=template["title"],
        summary=template["summary"],
        body=template["body"],
        starts_at=datetime.combine(event_date, starts_at_time),
        event_kind=template["event_kind"],
        image_url=template["image_url"],
    )

def create_cafe_lingua_event(event_date):
    return create_demo_post(
        slug=f"cafe-lingua-{event_date.isoformat()}",
        title="Café Lingua",
        summary="Language tables and tandem-friendly conversation rounds from 20:00 until around midnight.",
        body="Café Lingua is our regular Tuesday language exchange evening. Join from 20:00, choose a language table, switch groups during the night and stay for as long as you like.",
        starts_at=datetime.combine(event_date, time(20, 0, 0)),
        event_kind="cafe_lingua",
        image_url="/static/img/site/cafe-lingua.webp",
    )

def create_country_evening_event(event_date, country_name, description):
    return create_demo_post(
        slug=f"country-evening-{country_name.lower().replace(' ', '-')}-{event_date.isoformat()}",
        title=f"Country Evening: {country_name}",
        summary=description,
        body=f"Our Tuesday country evening starts at 20:00 and usually lasts until around midnight. This edition focuses on {country_name} with photos, music, stories, food ideas and time for questions.",
        starts_at=datetime.combine(event_date, time(20, 0, 0)),
        event_kind="country_evening",
        image_url="/static/img/site/country-evening.webp",
    )

def create_breakfast_event(event_date, theme_title, description):
    return create_demo_post(
        slug=f"international-breakfast-{event_date.isoformat()}",
        title=f"International Breakfast: {theme_title}",
        summary=f"{description} One Saturday breakfast this month, starting at 10:00.",
        body=f"Start the Saturday slowly with our monthly breakfast from 10:00. {description} The event is designed as an easy social start to the weekend.",
        starts_at=datetime.combine(event_date, time(10, 0, 0)),
        event_kind="breakfast",
        image_url="/static/img/site/international-breakfast.webp",
        registration_limit_enabled=True,
        registration_limit=40,
        registration_price_cents=200,
        registration_is_deposit=True,
    )

def create_trip_event(event_date, trip_title, description):
    rng = random.Random(f"trip:{event_date.isoformat()}:{trip_title}")
    return create_demo_post(
        slug=f"international-weekend-{event_date.isoformat()}",
        title=f"International Weekend: {trip_title}",
        summary=f"{description} Monthly Saturday day trip with morning departure and evening return.",
        body=f"This is our monthly Saturday day out. We meet in the morning, travel together and return in the evening. {description}",
        starts_at=datetime.combine(event_date, time(9, 30, 0)),
        event_kind="trip",
        image_url="/static/img/site/international-weekend.webp",
        registration_limit_enabled=True,
        registration_limit=rng.randint(60, 120),
        registration_price_cents=rng.randint(15, 40) * 100,
        registration_is_deposit=False,
    )

def seed_posts_demo_data():
    if Post.query.count() > 0:
        return

    now = get_configured_local_now()
    items = [
        create_demo_post(
            slug="incas-community-update",
            title="INCAS Community Update",
            summary="Demo content for the public site and admin panel.",
            body="This seeded post stays live until it is manually deactivated. The seeded calendar now includes weekly Tuesday evening examples and monthly Saturday breakfast and trip examples across several months.",
            is_pinned=True,
        ),
    ]
    tuesday_special_index = 0
    country_evening_index = 0
    breakfast_index = 0
    trip_index = 0

    for year, month in iter_demo_months(now.date()):
        tuesdays = month_weekdays(year, month, 1)
        saturdays = month_weekdays(year, month, 5)

        if tuesdays:
            items.append(
                create_dated_demo_event(
                    DEMO_TUESDAY_SPECIAL_EVENTS[tuesday_special_index % len(DEMO_TUESDAY_SPECIAL_EVENTS)],
                    tuesdays[0],
                    time(20, 0, 0),
                )
            )
            tuesday_special_index += 1

        if len(tuesdays) > 1:
            items.append(create_cafe_lingua_event(tuesdays[1]))

        if len(tuesdays) > 2:
            country_name, description = DEMO_COUNTRY_EVENING_THEMES[
                country_evening_index % len(DEMO_COUNTRY_EVENING_THEMES)
            ]
            items.append(create_country_evening_event(tuesdays[2], country_name, description))
            country_evening_index += 1

        for event_date in tuesdays[3:]:
            items.append(
                create_dated_demo_event(
                    DEMO_TUESDAY_SPECIAL_EVENTS[tuesday_special_index % len(DEMO_TUESDAY_SPECIAL_EVENTS)],
                    event_date,
                    time(20, 0, 0),
                )
            )
            tuesday_special_index += 1

        if saturdays:
            theme_title, description = DEMO_BREAKFAST_THEMES[
                breakfast_index % len(DEMO_BREAKFAST_THEMES)
            ]
            breakfast_slot = saturdays[0]
            items.append(create_breakfast_event(breakfast_slot, theme_title, description))
            breakfast_index += 1

        if len(saturdays) > 2:
            trip_title, description = DEMO_TRIP_DESTINATIONS[
                trip_index % len(DEMO_TRIP_DESTINATIONS)
            ]
            trip_slot = saturdays[2]
            items.append(create_trip_event(trip_slot, trip_title, description))
            trip_index += 1

    for item in items:
        db.session.add(item)

    db.session.commit()

def build_demo_offered_languages(country_code):
    native_languages = list(DEMO_COUNTRY_LANGUAGES.get(country_code, ["en"]))

    extra_pool = [code for code in DEMO_LANGUAGE_POOL if code not in native_languages]
    random.shuffle(extra_pool)

    extra_count = random.randint(0, 2)
    offered_languages = native_languages + extra_pool[:extra_count]

    return offered_languages

def build_demo_requested_languages(offered_languages):
    offered_set = set(offered_languages)
    pool = [code for code in DEMO_LANGUAGE_POOL if code not in offered_set]

    if not pool:
        return ["en"]

    random.shuffle(pool)
    count = random.randint(1, 3)

    return pool[:count]

def seed_language_tandem_demo_data(total=28):
    if LanguageTandemRequest.query.count() > 0:
        return

    now = datetime.utcnow()
    random.seed(20260422)
    items = []

    items.extend(build_structured_tandem_demo_requests(now))

    random_total = max(0, total - len(items))
    for index in range(random_total):
        items.append(build_random_demo_tandem_request(now, index))

    random.shuffle(items)

    for item in items:
        db.session.add(item)

    db.session.commit()

def seed_demo_data():
    seed_posts_demo_data()
    seed_language_tandem_demo_data()
