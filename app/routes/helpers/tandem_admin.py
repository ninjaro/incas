from collections import Counter, defaultdict
from datetime import datetime

from flask import url_for

from app.models import LanguageTandemRequest
from app.routes.helpers.tandem_form import (
    format_language_codes,
    get_country_label_map,
    get_language_label_map,
    normalize_country_code,
    normalize_single_language_code,
)


def normalize_email_key(value):
    return (value or "").strip().lower()


def build_tandem_request_signature(item):
    return (
        item.occupation or "",
        item.gender or "",
        item.birth_year or "",
        item.departure_date.isoformat() if item.departure_date else "",
        item.country_of_origin or "",
        tuple(sorted(item.offered_languages_list)),
        tuple(sorted(item.requested_languages_list)),
        bool(item.requested_native_only),
        bool(item.same_gender_only),
    )


def annotate_tandem_duplicates(items):
    grouped = defaultdict(list)

    for item in items:
        key = normalize_email_key(item.email) or f"request-{item.id}"
        grouped[key].append(item)

    for group_items in grouped.values():
        signature_counts = Counter(
            build_tandem_request_signature(item)
            for item in group_items
        )

        group_items.sort(
            key=lambda item: item.created_at or datetime.min,
            reverse=True,
        )

        for item in group_items:
            signature = build_tandem_request_signature(item)

            item.same_email_group_count = len(group_items)
            item.has_same_email_group = len(group_items) > 1
            item.has_likely_duplicate = signature_counts[signature] > 1
            item.same_email_other_ids = [
                other.id for other in group_items
                if other.id != item.id
            ]


def build_tandem_email_groups(items):
    grouped = defaultdict(list)

    for item in items:
        key = normalize_email_key(item.email) or f"request-{item.id}"
        grouped[key].append(item)

    result = []

    for email_key, group_items in grouped.items():
        group_items.sort(
            key=lambda item: item.created_at or datetime.min,
            reverse=True,
        )

        result.append({
            "email_key": email_key,
            "email": group_items[0].email,
            "requests": group_items,
            "count": len(group_items),
            "has_multiple": len(group_items) > 1,
            "has_likely_duplicate": any(
                getattr(item, "has_likely_duplicate", False)
                for item in group_items
            ),
            "latest_created_at": group_items[0].created_at,
        })

    result.sort(
        key=lambda group: group["latest_created_at"] or datetime.min,
        reverse=True,
    )

    return result

def matches_tandem_query(item, query):
    query = (query or "").strip().lower()
    if not query:
        return True

    haystack = " ".join([
        str(item.id),
        item.first_name or "",
        item.last_name or "",
        item.email or "",
        item.comment or "",
    ]).lower()

    return query in haystack

def matches_yes_no_filter(flag_value, raw_filter):
    raw_filter = (raw_filter or "").strip().lower()

    if raw_filter == "yes":
        return bool(flag_value)

    if raw_filter == "no":
        return not bool(flag_value)

    return True

def get_tandem_admin_filters(source, allow_duplicate_filters=False):
    filters = {
        "status": (source.get("status") or "all").strip(),
        "gender": (source.get("gender") or "").strip(),
        "occupation": (source.get("occupation") or "").strip(),
        "country": normalize_country_code(source.get("country")),
        "q": (source.get("q") or "").strip(),
        "offered_language": normalize_single_language_code(source.get("offered_language")),
        "requested_language": normalize_single_language_code(source.get("requested_language")),
        "native_only": (source.get("native_only") or "").strip(),
        "same_gender_only": (source.get("same_gender_only") or "").strip(),
        "duplicate_status": (source.get("duplicate_status") or "").strip(),
    }

    if not allow_duplicate_filters:
        filters["duplicate_status"] = ""

    return filters

def filter_tandem_admin_items(items, filters, allow_duplicate_filters=False):
    base_filtered_items = []

    for item in items:
        if filters["status"] == "viewed" and not item.is_viewed:
            continue
        if filters["status"] == "unviewed" and item.is_viewed:
            continue
        if filters["gender"] and item.gender != filters["gender"]:
            continue
        if filters["occupation"] and item.occupation != filters["occupation"]:
            continue
        if filters["country"] and item.country_of_origin != filters["country"]:
            continue
        if filters["offered_language"] and filters["offered_language"] not in item.offered_languages_list:
            continue
        if filters["requested_language"] and filters["requested_language"] not in item.requested_languages_list:
            continue
        if not matches_yes_no_filter(item.requested_native_only, filters["native_only"]):
            continue
        if not matches_yes_no_filter(item.same_gender_only, filters["same_gender_only"]):
            continue
        if not matches_tandem_query(item, filters["q"]):
            continue

        base_filtered_items.append(item)

    annotate_tandem_duplicates(base_filtered_items)

    if allow_duplicate_filters and filters["duplicate_status"] == "same_email":
        return [item for item in base_filtered_items if item.has_same_email_group]

    if allow_duplicate_filters and filters["duplicate_status"] == "likely":
        return [item for item in base_filtered_items if item.has_likely_duplicate]

    return base_filtered_items

def build_tandem_admin_context(filters, allow_duplicate_filters=False):
    items = (
        LanguageTandemRequest.query
        .order_by(LanguageTandemRequest.created_at.desc())
        .all()
    )

    country_labels = get_country_label_map()
    language_labels = get_language_label_map()

    for item in items:
        hydrate_tandem_request_display(item, country_labels=country_labels)

    filtered_items = filter_tandem_admin_items(
        items,
        filters=filters,
        allow_duplicate_filters=allow_duplicate_filters,
    )

    unviewed_items = [item for item in filtered_items if not item.is_viewed]
    viewed_items = [item for item in filtered_items if item.is_viewed]

    unviewed_groups = build_tandem_email_groups(unviewed_items)
    viewed_groups = build_tandem_email_groups(viewed_items)

    gender_counter = Counter(item.gender for item in filtered_items if item.gender)
    occupation_counter = Counter(item.occupation for item in filtered_items if item.occupation)
    country_counter = Counter(item.country_of_origin for item in filtered_items if item.country_of_origin)

    offered_language_counter = Counter()
    requested_language_counter = Counter()

    for item in filtered_items:
        offered_language_counter.update(set(item.offered_languages_list))
        requested_language_counter.update(set(item.requested_languages_list))

    stats = {
        "total_requests": len(items),
        "unviewed_requests": sum(1 for item in items if not item.is_viewed),
        "viewed_requests": sum(1 for item in items if item.is_viewed),
        "filtered_requests": len(filtered_items),
        "filtered_unviewed_requests": len(unviewed_items),
        "filtered_viewed_requests": len(viewed_items),
    }

    available_genders = sorted({item.gender for item in items if item.gender})
    available_occupations = sorted({item.occupation for item in items if item.occupation})
    available_country_codes = sorted(
        {item.country_of_origin for item in items if item.country_of_origin},
        key=lambda code: country_labels.get(code, code),
    )

    available_offered_language_codes = sorted(
        {code for item in items for code in item.offered_languages_list},
        key=lambda code: language_labels.get(code, code),
    )
    available_requested_language_codes = sorted(
        {code for item in items for code in item.requested_languages_list},
        key=lambda code: language_labels.get(code, code),
    )

    filter_options = {
        "genders": available_genders,
        "occupations": available_occupations,
        "countries": [
            {"code": code, "label": country_labels.get(code, code)}
            for code in available_country_codes
        ],
        "offered_languages": [
            {"code": code, "label": language_labels.get(code, code)}
            for code in available_offered_language_codes
        ],
        "requested_languages": [
            {"code": code, "label": language_labels.get(code, code)}
            for code in available_requested_language_codes
        ],
    }

    breakdowns = {
        "genders": build_counter_rows(gender_counter),
        "occupations": build_counter_rows(occupation_counter),
        "countries": build_counter_rows(country_counter, label_map=country_labels),
        "offered_languages": build_counter_rows(offered_language_counter, label_map=language_labels),
        "requested_languages": build_counter_rows(requested_language_counter, label_map=language_labels),
    }

    return {
        "stats": stats,
        "filtered_items": filtered_items,
        "unviewed_groups": unviewed_groups,
        "viewed_groups": viewed_groups,
        "filters": filters,
        "filter_options": filter_options,
        "breakdowns": breakdowns,
    }


def build_counter_rows(counter, label_map=None, limit=8):
    rows = []

    for key, count in counter.most_common(limit):
        if label_map is None:
            label = key
        elif callable(label_map):
            label = label_map(key)
        else:
            label = label_map.get(key, key)

        rows.append({
            "key": key,
            "label": label,
            "count": count,
        })

    return rows


_LEVEL_LABELS = {"1": "Beginner", "2": "Intermediate", "3": "Advanced", "4": "Fluent", "5": "Native"}


def hydrate_tandem_request_display(item, country_labels=None):
    country_labels = country_labels or get_country_label_map()
    language_labels = get_language_label_map()

    item.country_of_origin_display = country_labels.get(
        item.country_of_origin,
        item.country_of_origin,
    )
    item.offered_languages_display = format_language_codes(item.offered_languages_list)
    item.requested_languages_display = format_language_codes(item.requested_languages_list)

    levels_dict = item.offered_language_levels_dict
    item.offered_languages_with_levels = [
        {
            "name": language_labels.get(code, code),
            "level_label": _LEVEL_LABELS.get(levels_dict.get(code, ""), ""),
        }
        for code in item.offered_languages_list
    ]

    return item

def get_safe_tandem_return_url(value):
    candidate = (value or "").strip()
    if candidate.startswith("/admin/language-tandem"):
        return candidate
    return url_for("main.admin_language_tandem")
