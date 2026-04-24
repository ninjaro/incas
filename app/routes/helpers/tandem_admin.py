from collections import Counter, defaultdict
from datetime import datetime

from flask import url_for

from app.matching import MATCH_CONFIG, build_match_counts, build_match_rubric
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


TANDEM_ADMIN_DEFAULT_PER_PAGE = 24
TANDEM_ADMIN_PER_PAGE_OPTIONS = (12, 24, 48, 96)
TANDEM_ADMIN_GROUPING_OPTIONS = {"split", "combined"}
TANDEM_ADMIN_SORT_DEFAULTS = {
    "id": "desc",
    "created": "desc",
    "name": "asc",
    "email": "asc",
    "country": "asc",
    "occupation": "asc",
    "gender": "asc",
    "birth": "asc",
    "departure": "asc",
    "offered": "asc",
    "requested": "asc",
    "full": "desc",
    "partial": "desc",
    "weak": "desc",
    "total": "desc",
}
TANDEM_ADMIN_SORT_OPTIONS = [
    {"key": "created", "label": "Submitted"},
    {"key": "id", "label": "Request ID"},
    {"key": "name", "label": "Name"},
    {"key": "email", "label": "Email"},
    {"key": "country", "label": "Country"},
    {"key": "occupation", "label": "Occupation"},
    {"key": "gender", "label": "Gender"},
    {"key": "birth", "label": "Birth year"},
    {"key": "departure", "label": "Departure date"},
    {"key": "offered", "label": "Offered languages"},
    {"key": "requested", "label": "Requested languages"},
    {"key": "total", "label": "Total matches"},
    {"key": "full", "label": "Full matches"},
    {"key": "partial", "label": "Partial matches"},
    {"key": "weak", "label": "Weak matches"},
]
TANDEM_ADMIN_MATCH_COUNT_SORTS = {"full", "partial", "weak", "total"}
TANDEM_ADMIN_SECTION_CONFIG = (
    {
        "key": "unviewed",
        "title": "Unviewed Requests",
        "badge_class": "text-bg-dark",
        "page_key": "unviewed_page",
        "is_viewed": False,
    },
    {
        "key": "viewed",
        "title": "Viewed Requests",
        "badge_class": "text-bg-secondary",
        "page_key": "viewed_page",
        "is_viewed": True,
    },
)


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
    result = []
    current_group = None

    for item in items:
        email_key = normalize_email_key(item.email) or f"request-{item.id}"

        if current_group is None or current_group["email_key"] != email_key:
            group_size = getattr(item, "same_email_group_count", 1)
            current_group = {
                "email_key": email_key,
                "email": item.email,
                "requests": [],
                "count": group_size,
                "has_multiple": group_size > 1,
                "has_likely_duplicate": bool(getattr(item, "has_likely_duplicate", False)),
                "latest_created_at": item.created_at,
            }
            result.append(current_group)

        current_group["requests"].append(item)
        current_group["has_likely_duplicate"] = (
            current_group["has_likely_duplicate"]
            or bool(getattr(item, "has_likely_duplicate", False))
        )

    return result

def annotate_tandem_match_counts(items, candidate_items, language_labels):
    counts_by_id = build_match_counts(
        source_items=items,
        candidate_items=candidate_items,
        language_labels=language_labels,
        config=MATCH_CONFIG,
    )

    for item in items:
        item.match_counts = counts_by_id.get(item.id, {
            "full": 0,
            "partial": 0,
            "weak": 0,
            "total": 0,
        })


def build_tandem_match_count_legend(config=None):
    rubric = build_match_rubric(config or MATCH_CONFIG)

    return {
        "summary": (
            "Overview badges count candidates for that request across the full tandem pool, "
            "not just the requests shown on this page."
        ),
        "entries": rubric["thresholds"],
    }

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


def _parse_positive_int(value, default):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default

    return parsed if parsed > 0 else default


def _normalize_per_page(value):
    parsed = _parse_positive_int(value, TANDEM_ADMIN_DEFAULT_PER_PAGE)
    if parsed in TANDEM_ADMIN_PER_PAGE_OPTIONS:
        return parsed
    return TANDEM_ADMIN_DEFAULT_PER_PAGE


def _normalize_grouping(value):
    candidate = (value or "split").strip().lower()
    return candidate if candidate in TANDEM_ADMIN_GROUPING_OPTIONS else "split"


def _normalize_sort_key(value):
    candidate = (value or "created").strip().lower()
    return candidate if candidate in TANDEM_ADMIN_SORT_DEFAULTS else "created"


def _normalize_sort_direction(sort_key, value):
    candidate = (value or TANDEM_ADMIN_SORT_DEFAULTS[sort_key]).strip().lower()
    return candidate if candidate in {"asc", "desc"} else TANDEM_ADMIN_SORT_DEFAULTS[sort_key]

def get_tandem_admin_filters(source, allow_duplicate_filters=False):
    sort_by = _normalize_sort_key(source.get("sort_by"))

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
        "sort_by": sort_by,
        "sort_dir": _normalize_sort_direction(sort_by, source.get("sort_dir")),
        "per_page": _normalize_per_page(source.get("per_page")),
        "grouping": _normalize_grouping(source.get("grouping")),
        "all_page": _parse_positive_int(source.get("all_page"), 1),
        "unviewed_page": _parse_positive_int(source.get("unviewed_page"), 1),
        "viewed_page": _parse_positive_int(source.get("viewed_page"), 1),
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


def tandem_admin_sort_uses_match_counts(sort_key):
    return sort_key in TANDEM_ADMIN_MATCH_COUNT_SORTS


def _build_offered_language_sort_value(item, language_labels):
    levels = item.offered_language_levels_dict
    parts = []

    for code in item.offered_languages_list:
        label = language_labels.get(code, code)
        level_label = _LEVEL_LABELS.get(levels.get(code, ""), "")
        if level_label:
            parts.append(f"{label} {level_label}")
        else:
            parts.append(label)

    return ", ".join(parts).lower()


def _build_requested_language_sort_value(item, language_labels):
    return ", ".join(
        language_labels.get(code, code)
        for code in item.requested_languages_list
    ).lower()


def _sort_value_for_request(item, sort_key, country_labels, language_labels):
    if sort_key == "id":
        return item.id or 0
    if sort_key == "created":
        return item.created_at or datetime.min
    if sort_key == "name":
        return (
            (item.last_name or "").lower(),
            (item.first_name or "").lower(),
        )
    if sort_key == "email":
        return (item.email or "").lower()
    if sort_key == "country":
        return country_labels.get(item.country_of_origin, item.country_of_origin or "").lower()
    if sort_key == "occupation":
        return (item.occupation or "").lower()
    if sort_key == "gender":
        return (item.gender or "").lower()
    if sort_key == "birth":
        return item.birth_year or 0
    if sort_key == "departure":
        return item.departure_date or datetime.min.date()
    if sort_key == "offered":
        return _build_offered_language_sort_value(item, language_labels)
    if sort_key == "requested":
        return _build_requested_language_sort_value(item, language_labels)
    if sort_key in TANDEM_ADMIN_MATCH_COUNT_SORTS:
        return getattr(item, "match_counts", {}).get(sort_key, 0)
    return item.created_at or datetime.min


def sort_tandem_admin_items(items, sort_key, sort_dir, country_labels, language_labels):
    sorted_items = sorted(items, key=lambda item: item.id or 0, reverse=True)
    sorted_items.sort(
        key=lambda item: _sort_value_for_request(
            item,
            sort_key,
            country_labels,
            language_labels,
        ),
        reverse=(sort_dir == "desc"),
    )
    return sorted_items


def paginate_tandem_admin_items(items, page, per_page):
    total_items = len(items)

    if total_items == 0:
        return {
            "items": [],
            "page": 1,
            "pages": 0,
            "has_prev": False,
            "has_next": False,
            "prev_page": None,
            "next_page": None,
            "start_index": 0,
            "end_index": 0,
            "count": 0,
            "total_items": 0,
        }

    pages = ((total_items - 1) // per_page) + 1
    current_page = min(max(page, 1), pages)
    start = (current_page - 1) * per_page
    end = start + per_page
    page_items = items[start:end]

    return {
        "items": page_items,
        "page": current_page,
        "pages": pages,
        "has_prev": current_page > 1,
        "has_next": current_page < pages,
        "prev_page": current_page - 1 if current_page > 1 else None,
        "next_page": current_page + 1 if current_page < pages else None,
        "start_index": start + 1,
        "end_index": start + len(page_items),
        "count": len(page_items),
        "total_items": total_items,
    }


def build_tandem_overview_section_configs(filters):
    if filters["status"] == "unviewed":
        return [{
            "key": "unviewed",
            "title": "Unviewed Requests",
            "badge_class": "text-bg-dark",
            "page_key": "all_page",
            "is_viewed": False,
        }]

    if filters["status"] == "viewed":
        return [{
            "key": "viewed",
            "title": "Viewed Requests",
            "badge_class": "text-bg-secondary",
            "page_key": "all_page",
            "is_viewed": True,
        }]

    if filters["grouping"] == "combined":
        return [{
            "key": "all",
            "title": "All Requests",
            "badge_class": "text-bg-primary",
            "page_key": "all_page",
            "is_viewed": None,
        }]

    return list(TANDEM_ADMIN_SECTION_CONFIG)

def build_tandem_admin_context(filters, allow_duplicate_filters=False):
    items = (
        LanguageTandemRequest.query
        .order_by(LanguageTandemRequest.created_at.desc())
        .all()
    )

    country_labels = get_country_label_map()
    language_labels = get_language_label_map()

    filtered_items = filter_tandem_admin_items(
        items,
        filters=filters,
        allow_duplicate_filters=allow_duplicate_filters,
    )

    gender_counter = Counter(item.gender for item in filtered_items if item.gender)
    occupation_counter = Counter(item.occupation for item in filtered_items if item.occupation)
    country_counter = Counter(item.country_of_origin for item in filtered_items if item.country_of_origin)

    offered_language_counter = Counter()
    requested_language_counter = Counter()

    for item in filtered_items:
        offered_language_counter.update(set(item.offered_languages_list))
        requested_language_counter.update(set(item.requested_languages_list))

    if tandem_admin_sort_uses_match_counts(filters["sort_by"]):
        annotate_tandem_match_counts(
            filtered_items,
            candidate_items=items,
            language_labels=language_labels,
        )

    sorted_filtered_items = sort_tandem_admin_items(
        filtered_items,
        sort_key=filters["sort_by"],
        sort_dir=filters["sort_dir"],
        country_labels=country_labels,
        language_labels=language_labels,
    )

    visible_items = []
    sections = []
    section_configs = build_tandem_overview_section_configs(filters)

    for section_config in section_configs:
        if section_config["is_viewed"] is None:
            section_items = list(sorted_filtered_items)
        else:
            section_items = [
                item for item in sorted_filtered_items
                if bool(item.is_viewed) == section_config["is_viewed"]
            ]
        pagination = paginate_tandem_admin_items(
            section_items,
            page=filters[section_config["page_key"]],
            per_page=filters["per_page"],
        )
        page_items = pagination["items"]
        visible_items.extend(page_items)

        sections.append({
            "key": section_config["key"],
            "title": section_config["title"],
            "badge_class": section_config["badge_class"],
            "count": len(section_items),
            "groups": build_tandem_email_groups(page_items),
            "page_key": section_config["page_key"],
            "pagination": pagination,
        })

    if visible_items and not tandem_admin_sort_uses_match_counts(filters["sort_by"]):
        annotate_tandem_match_counts(
            visible_items,
            candidate_items=items,
            language_labels=language_labels,
        )

    for item in visible_items:
        hydrate_tandem_request_display(
            item,
            country_labels=country_labels,
            language_labels=language_labels,
        )

    stats = {
        "total_requests": len(items),
        "unviewed_requests": sum(1 for item in items if not item.is_viewed),
        "viewed_requests": sum(1 for item in items if item.is_viewed),
        "filtered_requests": len(filtered_items),
        "filtered_unviewed_requests": sum(
            1 for item in filtered_items if not item.is_viewed
        ),
        "filtered_viewed_requests": sum(
            1 for item in filtered_items if item.is_viewed
        ),
        "visible_requests": len(visible_items),
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
        "overview_sections": sections,
        "match_count_legend": build_tandem_match_count_legend(MATCH_CONFIG),
        "filters": filters,
        "filter_options": filter_options,
        "breakdowns": breakdowns,
        "sort_options": TANDEM_ADMIN_SORT_OPTIONS,
        "sort_defaults": TANDEM_ADMIN_SORT_DEFAULTS,
        "per_page_options": TANDEM_ADMIN_PER_PAGE_OPTIONS,
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


def hydrate_tandem_request_display(item, country_labels=None, language_labels=None):
    country_labels = country_labels or get_country_label_map()
    language_labels = language_labels or get_language_label_map()

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
