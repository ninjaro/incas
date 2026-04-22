import json
from collections import Counter
from datetime import datetime
from functools import lru_cache

import pycountry
from babel import Locale
from babel.languages import get_official_languages
from flask import render_template

from app.models import LanguageTandemRequest


def normalize_country_code(value):
    code = (value or "").strip().upper()
    if code not in get_country_label_map():
        return ""
    return code

def normalize_language_codes(values):
    labels = get_language_label_map()

    cleaned = []
    seen = set()

    for value in values:
        code = (value or "").strip().lower()
        if not code or code not in labels or code in seen:
            continue
        seen.add(code)
        cleaned.append(code)

    return cleaned


@lru_cache(maxsize=1)
def get_country_label_map():
    locale = Locale("en")

    labels = {}
    for country in pycountry.countries:
        code = getattr(country, "alpha_2", None)
        if not code:
            continue
        labels[code] = locale.territories.get(code, country.name)

    return labels

@lru_cache(maxsize=1)
def get_country_options():
    labels = get_country_label_map()
    return [
        {"code": code, "label": label}
        for code, label in sorted(labels.items(), key=lambda item: item[1])
    ]

@lru_cache(maxsize=1)
def get_language_label_map():
    locale = Locale("en")

    labels = {}
    for language in pycountry.languages:
        code = getattr(language, "alpha_2", None)
        if not code or len(code) != 2:
            continue
        if code in labels:
            continue

        fallback = getattr(language, "name", code)
        labels[code] = locale.languages.get(code, fallback)

    return labels


def get_country_recommended_language_codes(country_code):
    if not country_code:
        return []

    allowed_codes = get_language_label_map()

    try:
        codes = get_official_languages(
            country_code,
            regional=False,
            de_facto=True,
        )
    except Exception:
        return []

    return [code for code in codes if code in allowed_codes]


def get_offered_language_counts():
    counts = Counter()
    rows = (
        LanguageTandemRequest.query
        .with_entities(LanguageTandemRequest.offered_languages)
        .all()
    )

    for row in rows:
        raw_value = row[0] or "[]"

        try:
            codes = json.loads(raw_value)
        except (TypeError, ValueError):
            continue

        for code in set(codes):
            if code in get_language_label_map():
                counts[code] += 1

    return counts


def get_signal_level(count, max_count):
    if count <= 0 or max_count <= 0:
        return 0

    ratio = count / max_count

    if ratio >= 0.75:
        return 4
    if ratio >= 0.50:
        return 3
    if ratio >= 0.25:
        return 2
    return 1


def build_language_field_context(selected_codes, hint_codes, popularity_counts):
    labels = get_language_label_map()
    hint_set = set(hint_codes)
    max_count = max(popularity_counts.values(), default=0)

    all_choices = []
    for code, label in labels.items():
        popularity = popularity_counts.get(code, 0)
        all_choices.append(
            {
                "code": code,
                "label": label,
                "popularity": popularity,
                "signal_level": get_signal_level(popularity, max_count),
                "is_hint": code in hint_set,
                "is_selected": code in selected_codes,
            }
        )

    all_choices.sort(key=lambda item: item["label"].lower())
    by_code = {item["code"]: item for item in all_choices}

    hint_choices = []
    for code in hint_codes:
        choice = by_code.get(code)
        if choice is not None:
            hint_choices.append(choice)

    return {
        "hint_choices": hint_choices,
        "all_choices": all_choices,
    }



def build_language_tandem_form_context(values):
    offered_counts = get_offered_language_counts()

    offered_field = build_language_field_context(
        selected_codes=values["offered_languages"],
        hint_codes=get_country_recommended_language_codes(values["country_of_origin"]),
        popularity_counts=offered_counts,
    )

    requested_field = build_language_field_context(
        selected_codes=values["requested_languages"],
        hint_codes=[code for code, _count in offered_counts.most_common(8)],
        popularity_counts=offered_counts,
    )

    return {
        "country_options": get_country_options(),
        "offered_field": offered_field,
        "requested_field": requested_field,
    }


def render_language_tandem_form_page(values):
    context = build_language_tandem_form_context(values)

    return render_template(
        "forms/language_tandem.html",
        values=values,
        **context,
    )


def parse_birth_year(value):
    value = (value or "").strip()
    if not value:
        return None

    try:
        year = int(value)
    except ValueError:
        return None

    current_year = datetime.utcnow().year
    if year < 1900 or year > current_year:
        return None

    return year

def parse_departure_date(value):
    value = (value or "").strip()
    if not value:
        return None

    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def format_language_codes(codes):
    labels = get_language_label_map()
    return [labels.get(code, code) for code in codes]


def build_tandem_form_values(item=None):
    known_occupations = {
        "Student at RWTH Aachen",
        "Student at FH Aachen",
    }

    if item is None:
        return {
            "first_name": "",
            "last_name": "",
            "email": "",
            "occupation": "",
            "occupation_other": "",
            "gender": "",
            "birth_year": "",
            "departure_date": "",
            "country_of_origin": "",
            "offered_languages": [],
            "offered_native_languages": [],
            "offered_language_levels": {},
            "requested_languages": [],
            "requested_native_only": False,
            "same_gender_only": False,
            "comment": "",
        }

    raw_occupation = item.occupation or ""
    is_known_occupation = raw_occupation in known_occupations

    return {
        "first_name": item.first_name,
        "last_name": item.last_name,
        "email": item.email,
        "occupation": raw_occupation if is_known_occupation else "other",
        "occupation_other": "" if is_known_occupation else raw_occupation,
        "gender": item.gender,
        "birth_year": str(item.birth_year or ""),
        "departure_date": item.departure_date.strftime("%Y-%m-%d") if item.departure_date else "",
        "country_of_origin": item.country_of_origin,
        "offered_languages": list(item.offered_languages_list),
        "offered_native_languages": list(item.offered_native_languages_list),
        "offered_language_levels": dict(item.offered_language_levels_dict),
        "requested_languages": list(item.requested_languages_list),
        "requested_native_only": bool(item.requested_native_only),
        "same_gender_only": bool(item.same_gender_only),
        "comment": item.comment or "",
    }


def render_admin_language_tandem_edit_page(item, values, return_to):
    offered_counts = get_offered_language_counts()

    offered_field = build_language_field_context(
        selected_codes=values["offered_languages"],
        hint_codes=get_country_recommended_language_codes(values["country_of_origin"]),
        popularity_counts=offered_counts,
    )

    requested_field = build_language_field_context(
        selected_codes=values["requested_languages"],
        hint_codes=[],
        popularity_counts=offered_counts,
    )

    return render_template(
        "admin/language_tandem/edit.html",
        item=item,
        values=values,
        return_to=return_to,
        country_options=get_country_options(),
        offered_field=offered_field,
        requested_field=requested_field,
    )

def normalize_single_language_code(value):
    codes = normalize_language_codes([value])
    return codes[0] if codes else ""
