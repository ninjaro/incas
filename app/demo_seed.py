import json
import random
from datetime import datetime, time, timedelta

from app.models import LanguageTandemRequest, Post, db

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
    requested_languages,
    requested_native_only=False,
    same_gender_only=False,
    comment="",
    is_viewed=False,
    created_at=None,
):
    created_at = created_at or datetime.utcnow()

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
    requested_languages,
    requested_native_only=False,
    same_gender_only=False,
    comment="",
    second_created_at_offset_minutes=20,
    second_email=None,
    second_first_name=None,
    second_last_name=None,
    second_offered_languages=None,
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

def build_structured_duplicate_demo_requests(now):
    items = []

    add_demo_request_pair(
        items,
        base_created_at=now - timedelta(days=2, hours=3),
        first_name="Anna",
        last_name="Meyer",
        email="anna.meyer@example.com",
        occupation="Student at RWTH Aachen",
        gender="Female",
        birth_year=2001,
        departure_date=(now + timedelta(days=120)).date(),
        country_of_origin="DE",
        offered_languages=["de", "en"],
        requested_languages=["es"],
        comment="I am available on weekdays after classes.",
        second_comment="I am available on weekdays after classes.",
    )

    add_demo_request_pair(
        items,
        base_created_at=now - timedelta(days=4, hours=1),
        first_name="Omar",
        last_name="Khan",
        email="omar.khan@example.com",
        occupation="Student at FH Aachen",
        gender="Male",
        birth_year=1998,
        departure_date=(now + timedelta(days=90)).date(),
        country_of_origin="IN",
        offered_languages=["hi", "en"],
        requested_languages=["de"],
        requested_native_only=False,
        same_gender_only=False,
        comment="I would like to practice conversation regularly.",
        second_requested_languages=["de", "fr"],
        second_comment="Adding French too after talking to the office.",
    )

    add_demo_request_pair(
        items,
        base_created_at=now - timedelta(days=6, hours=6),
        first_name="Luca",
        last_name="Rossi",
        email="luca.rossi@example.com",
        occupation="Student at RWTH Aachen",
        gender="Male",
        birth_year=2000,
        departure_date=(now + timedelta(days=150)).date(),
        country_of_origin="IT",
        offered_languages=["it", "en"],
        requested_languages=["de"],
        requested_native_only=True,
        same_gender_only=False,
        comment="I prefer evening meetings.",
        second_requested_languages=["de", "es"],
        second_requested_native_only=True,
        second_comment="Updated request after orientation week.",
    )

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
        requested_languages=["de"],
        same_gender_only=True,
        comment="I prefer a same gender tandem.",
        second_email="sara.petrovva@example.com",
        second_last_name="Petrovva",
        second_requested_languages=["de"],
        second_comment="Resubmitted after email typo.",
    )

    items.append(
        create_demo_tandem_request(
            first_name="Mariam",
            last_name="Yilmaz",
            email="mariam.yilmaz@example.com",
            occupation="Student at FH Aachen",
            gender="Female",
            birth_year=1999,
            departure_date=(now + timedelta(days=110)).date(),
            country_of_origin="TR",
            offered_languages=["tr", "en"],
            requested_languages=["de"],
            comment="Morning meetings are better for me.",
            is_viewed=False,
            created_at=now - timedelta(days=3, hours=2),
        )
    )

    items.append(
        create_demo_tandem_request(
            first_name="Mariam",
            last_name="Ylmaz",
            email="mariam.yilmaz+2@example.com",
            occupation="Student at FH Aachen",
            gender="Female",
            birth_year=1999,
            departure_date=(now + timedelta(days=112)).date(),
            country_of_origin="TR",
            offered_languages=["tr", "en"],
            requested_languages=["de"],
            comment="Morning meetings are better for me.",
            is_viewed=False,
            created_at=now - timedelta(days=3, hours=1, minutes=30),
        )
    )

    return items

def build_random_demo_tandem_request(now, index):
    country_codes = list(DEMO_COUNTRY_LANGUAGES.keys())

    first_name = random.choice(DEMO_FIRST_NAMES)
    last_name = random.choice(DEMO_LAST_NAMES)
    country_code = random.choice(country_codes)

    offered_languages = build_demo_offered_languages(country_code)
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
        requested_languages=requested_languages,
        requested_native_only=random.random() < 0.35,
        same_gender_only=random.random() < 0.20,
        comment=random.choice(DEMO_COMMENTS),
        is_viewed=random.random() < 0.60,
        created_at=created_at,
    )

def seed_posts_demo_data():
    if Post.query.count() > 0:
        return

    now = datetime.utcnow()

    upcoming_event_date = (now + timedelta(days=3)).date()
    past_event_date = (now - timedelta(days=10)).date()

    post_1 = Post(
        slug="incas-community-update",
        title="INCAS Community Update",
        summary="A regular post without a time slot.",
        body="This is a regular post. It stays live until it is manually deactivated.",
        starts_at=None,
        is_active=True,
    )

    post_2 = Post(
        slug="spring-gathering",
        title="Spring Gathering",
        summary="An upcoming event with the default evening slot.",
        body="This is an event post. It is treated as live until 06:00 on the next day.",
        starts_at=datetime.combine(upcoming_event_date, time(20, 0, 0)),
        is_active=True,
    )

    post_3 = Post(
        slug="past-meeting",
        title="Past Meeting",
        summary="A past event that stays visible in the archive section.",
        body="This event is no longer live, but it still opens normally from the wall.",
        starts_at=datetime.combine(past_event_date, time(20, 0, 0)),
        is_active=True,
    )

    db.session.add(post_1)
    db.session.add(post_2)
    db.session.add(post_3)
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
    items = []

    items.extend(build_structured_duplicate_demo_requests(now))

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

