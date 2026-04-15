import json
from datetime import datetime
from difflib import SequenceMatcher

DUPLICATE_REVIEW_CONFIG = {
    "weights": {
        "exact_email": 90,
        "normalized_email": 70,
        "email_similarity": 20,
        "first_name_similarity": 12,
        "last_name_similarity": 18,
        "birth_year_match": 8,
        "country_match": 6,
        "occupation_match": 4,
        "gender_match": 4,
        "offered_overlap": 18,
        "requested_overlap": 18,
        "same_signature": 24,
        "close_departure_date": 6,
        "close_created_at": 8,
    },
    "thresholds": {
        "exact": 85,
        "likely": 55,
    },
    "limits": {
        "suggestions": 20,
    },
}


MERGE_FIELD_CONFIG = [
    {"name": "first_name", "label": "First Name", "allow_append": False},
    {"name": "last_name", "label": "Last Name", "allow_append": False},
    {"name": "email", "label": "Email", "allow_append": False},
    {"name": "occupation", "label": "Occupation", "allow_append": False},
    {"name": "gender", "label": "Gender", "allow_append": False},
    {"name": "birth_year", "label": "Birth Year", "allow_append": False},
    {"name": "departure_date", "label": "Departure Date", "allow_append": False},
    {"name": "country_of_origin", "label": "Country", "allow_append": False},
    {"name": "offered_languages", "label": "Offered Languages", "allow_append": False},
    {"name": "requested_languages", "label": "Requested Languages", "allow_append": False},
    {"name": "requested_native_only", "label": "Native Only", "allow_append": False},
    {"name": "same_gender_only", "label": "Same Gender Only", "allow_append": False},
    {"name": "comment", "label": "Comment", "allow_append": True},
]


def canonicalize_duplicate_pair(left_id, right_id):
    left_id = int(left_id)
    right_id = int(right_id)
    return (left_id, right_id) if left_id <= right_id else (right_id, left_id)


def normalize_text(value):
    return " ".join((value or "").strip().lower().split())


def normalize_email_for_matching(value):
    value = normalize_text(value)
    if "@" not in value:
        return value

    local_part, domain = value.split("@", 1)
    local_part = local_part.split("+", 1)[0]

    return f"{local_part}@{domain}"


def similarity_ratio(left, right):
    left = normalize_text(left)
    right = normalize_text(right)

    if not left or not right:
        return 0.0

    if left == right:
        return 1.0

    return SequenceMatcher(None, left, right).ratio()


def overlap_ratio(left_values, right_values):
    left_set = set(left_values)
    right_set = set(right_values)

    if not left_set or not right_set:
        return 0.0

    return len(left_set & right_set) / len(left_set | right_set)


def build_request_signature(item):
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


def get_older_and_newer_request(left_item, right_item):
    def sort_key(item):
        return (item.created_at or datetime.min, item.id)

    older_item, newer_item = sorted([left_item, right_item], key=sort_key)
    return older_item, newer_item


def evaluate_duplicate_candidate(source_item, candidate_item, config=None):
    config = config or DUPLICATE_REVIEW_CONFIG

    if source_item.id == candidate_item.id:
        return None

    weights = config["weights"]
    thresholds = config["thresholds"]

    score = 0
    reasons = []

    exact_email_match = normalize_text(source_item.email) == normalize_text(candidate_item.email)
    normalized_email_match = (
        normalize_email_for_matching(source_item.email)
        and normalize_email_for_matching(source_item.email) == normalize_email_for_matching(candidate_item.email)
    )

    first_name_ratio = similarity_ratio(source_item.first_name, candidate_item.first_name)
    last_name_ratio = similarity_ratio(source_item.last_name, candidate_item.last_name)
    email_ratio = similarity_ratio(
        normalize_email_for_matching(source_item.email),
        normalize_email_for_matching(candidate_item.email),
    )

    offered_overlap = overlap_ratio(
        source_item.offered_languages_list,
        candidate_item.offered_languages_list,
    )
    requested_overlap = overlap_ratio(
        source_item.requested_languages_list,
        candidate_item.requested_languages_list,
    )

    if exact_email_match:
        score += weights["exact_email"]
        reasons.append("Exact same email")
    elif normalized_email_match:
        score += weights["normalized_email"]
        reasons.append("Email looks like the same inbox")
    elif email_ratio >= 0.92:
        score += weights["email_similarity"]
        reasons.append("Very similar email")

    if first_name_ratio >= 0.9:
        score += weights["first_name_similarity"]
        reasons.append("Very similar first name")
    elif first_name_ratio >= 0.75:
        score += round(weights["first_name_similarity"] * 0.6)
        reasons.append("Similar first name")

    if last_name_ratio >= 0.9:
        score += weights["last_name_similarity"]
        reasons.append("Very similar last name")
    elif last_name_ratio >= 0.75:
        score += round(weights["last_name_similarity"] * 0.6)
        reasons.append("Similar last name")

    if source_item.birth_year and candidate_item.birth_year and source_item.birth_year == candidate_item.birth_year:
        score += weights["birth_year_match"]
        reasons.append("Same birth year")

    if source_item.country_of_origin and candidate_item.country_of_origin and source_item.country_of_origin == candidate_item.country_of_origin:
        score += weights["country_match"]
        reasons.append("Same country")

    if source_item.occupation and candidate_item.occupation and source_item.occupation == candidate_item.occupation:
        score += weights["occupation_match"]
        reasons.append("Same occupation")

    if source_item.gender and candidate_item.gender and source_item.gender == candidate_item.gender:
        score += weights["gender_match"]
        reasons.append("Same gender")

    if offered_overlap > 0:
        score += round(weights["offered_overlap"] * offered_overlap)
        reasons.append("Offered languages overlap")

    if requested_overlap > 0:
        score += round(weights["requested_overlap"] * requested_overlap)
        reasons.append("Requested languages overlap")

    if build_request_signature(source_item) == build_request_signature(candidate_item):
        score += weights["same_signature"]
        reasons.append("Almost identical request details")

    if source_item.departure_date and candidate_item.departure_date:
        gap_days = abs((source_item.departure_date - candidate_item.departure_date).days)
        if gap_days <= 7:
            score += weights["close_departure_date"]
            reasons.append("Very close departure date")

    if source_item.created_at and candidate_item.created_at:
        gap_seconds = abs((source_item.created_at - candidate_item.created_at).total_seconds())
        if gap_seconds <= 3600:
            score += weights["close_created_at"]
            reasons.append("Submitted close in time")
        elif gap_seconds <= 86400:
            score += round(weights["close_created_at"] * 0.5)
            reasons.append("Submitted within one day")

    if exact_email_match or score >= thresholds["exact"]:
        category = "exact"
    elif score >= thresholds["likely"]:
        category = "likely"
    else:
        return None

    signal_level = min(4, max(1, round(score / 25)))

    return {
        "candidate": candidate_item,
        "category": category,
        "score": score,
        "signal_level": signal_level,
        "reasons": reasons,
    }


def build_duplicate_candidates(source_item, candidate_items, config=None):
    config = config or DUPLICATE_REVIEW_CONFIG

    results = []

    for candidate_item in candidate_items:
        result = evaluate_duplicate_candidate(
            source_item=source_item,
            candidate_item=candidate_item,
            config=config,
        )
        if result is None:
            continue

        results.append(result)

    results.sort(
        key=lambda item: (
            0 if item["category"] == "exact" else 1,
            -item["score"],
            -(item["candidate"].created_at.timestamp() if item["candidate"].created_at else 0),
            (item["candidate"].last_name or "").lower(),
            (item["candidate"].first_name or "").lower(),
        )
    )

    return results[:config["limits"]["suggestions"]]


def _format_bool(value):
    return "Yes" if value else "No"


def _format_languages(codes, label_map):
    return ", ".join(label_map.get(code, code) for code in codes) or "—"


def get_merge_field_raw_value(item, field_name):
    if field_name == "offered_languages":
        return list(item.offered_languages_list)
    if field_name == "requested_languages":
        return list(item.requested_languages_list)
    return getattr(item, field_name)


def get_merge_field_display_value(item, field_name, country_labels, language_labels):
    value = get_merge_field_raw_value(item, field_name)

    if field_name == "country_of_origin":
        return country_labels.get(value, value or "—")

    if field_name in {"offered_languages", "requested_languages"}:
        return _format_languages(value, language_labels)

    if field_name in {"requested_native_only", "same_gender_only"}:
        return _format_bool(value)

    if field_name == "departure_date":
        return value.strftime("%Y-%m-%d") if value else "—"

    return str(value or "—")


def build_duplicate_merge_rows(older_item, newer_item, country_labels, language_labels):
    rows = []
    unchanged_count = 0

    for field in MERGE_FIELD_CONFIG:
        field_name = field["name"]

        old_raw = get_merge_field_raw_value(older_item, field_name)
        new_raw = get_merge_field_raw_value(newer_item, field_name)

        if old_raw == new_raw:
            unchanged_count += 1
            continue

        choices = [
            {"value": "old", "label": "Use old"},
            {"value": "new", "label": "Use new"},
        ]

        if field["allow_append"]:
            choices.append({"value": "append_old_to_new", "label": "Append old to new"})

        rows.append({
            "name": field_name,
            "label": field["label"],
            "old_display": get_merge_field_display_value(older_item, field_name, country_labels, language_labels),
            "new_display": get_merge_field_display_value(newer_item, field_name, country_labels, language_labels),
            "choices": choices,
            "default_choice": "new",
        })

    return rows, unchanged_count


def _merge_comment_values(old_value, new_value):
    old_value = (old_value or "").strip()
    new_value = (new_value or "").strip()

    if not old_value:
        return new_value
    if not new_value:
        return old_value
    if old_value == new_value:
        return new_value

    return f"{new_value}\n\n{old_value}"


def apply_merge_choice(newer_item, older_item, field_name, choice):
    old_value = get_merge_field_raw_value(older_item, field_name)
    new_value = get_merge_field_raw_value(newer_item, field_name)

    if choice == "old":
        final_value = old_value
    elif choice == "new":
        final_value = new_value
    elif choice == "append_old_to_new" and field_name == "comment":
        final_value = _merge_comment_values(old_value, new_value)
    else:
        raise ValueError(f"Unsupported merge choice: {choice}")

    if field_name == "offered_languages":
        newer_item.offered_languages = json.dumps(final_value or [])
        return

    if field_name == "requested_languages":
        newer_item.requested_languages = json.dumps(final_value or [])
        return

    setattr(newer_item, field_name, final_value)
