from collections import defaultdict

MATCH_CONFIG = {
    "weights": {
        "requested_level_scores": {
            1: 25,
            2: 45,
            3: 60,
            4: 72,
            5: 82,
        },
        "reverse_level_scores": {
            1: 10,
            2: 18,
            3: 27,
            4: 34,
            5: 40,
        },
        "extra_requested_overlap": 10,
        "extra_reverse_overlap": 5,
        "same_country_penalty": 15,
        "gender_preference_mismatch_penalty": 20,
        "native_preference_unconfirmed_penalty": 25,
        "departure_gap_medium_penalty": 8,
        "departure_gap_large_penalty": 15,
    },
    "thresholds": {
        "full": 105,
        "partial": 65,
        "weak": 35,
    },
    "departure_gap_days": {
        "medium": 45,
        "large": 90,
    },
    "limits": {
        "full": 8,
        "partial": 12,
        "weak": 12,
    },
    "signal": {
        "max_level": 4,
    },
}

LEVEL_LABELS = {
    1: "Beginner",
    2: "Intermediate",
    3: "Advanced",
    4: "Fluent",
    5: "Native",
}

def _labels_for_codes(codes, label_map):
    return [label_map.get(code, code) for code in codes]

def _offered_level(item, code):
    levels = item.offered_language_levels_dict
    raw_level = levels.get(code)

    try:
        level = int(raw_level)
    except (TypeError, ValueError):
        level = 5 if code in item.offered_native_languages_list else 3

    return min(5, max(1, level))

def _level_label(level):
    return LEVEL_LABELS.get(level, str(level))

def _overlap_details(offering_item, requested_codes, language_labels):
    details = []

    for code in requested_codes:
        level = _offered_level(offering_item, code)
        details.append({
            "code": code,
            "label": language_labels.get(code, code),
            "level": level,
            "level_label": _level_label(level),
        })

    return details

def _format_overlap_details(details):
    return ", ".join(
        f"{detail['label']} ({_level_label(detail['level'])})"
        for detail in details
    )

def _score_language_levels(details, scores):
    if not details:
        return 0

    best_score = max(scores[detail["level"]] for detail in details)
    extra_score = sum(
        max(0, scores[detail["level"]] // 3)
        for detail in details
    ) - max(0, best_score // 3)

    return best_score + extra_score

def _native_preference_unconfirmed(details):
    return bool(details) and max(detail["level"] for detail in details) < 5

def _cap_category(category, max_category):
    order = ["weak", "partial", "full"]
    return order[min(order.index(category), order.index(max_category))]

def evaluate_match(source_item, candidate_item, language_labels, config=None):
    config = config or MATCH_CONFIG

    if source_item.id is not None and source_item.id == candidate_item.id:
        return None

    source_requested = set(source_item.requested_languages_list)
    source_offered = set(source_item.offered_languages_list)

    candidate_requested = set(candidate_item.requested_languages_list)
    candidate_offered = set(candidate_item.offered_languages_list)

    requested_overlap = sorted(source_requested & candidate_offered)
    if not requested_overlap:
        return None

    reverse_overlap = sorted(candidate_requested & source_offered)
    requested_overlap_details = _overlap_details(
        candidate_item,
        requested_overlap,
        language_labels,
    )
    reverse_overlap_details = _overlap_details(
        source_item,
        reverse_overlap,
        language_labels,
    )

    weights = config["weights"]
    thresholds = config["thresholds"]
    gap_rules = config["departure_gap_days"]

    score = 0
    reasons = []
    warnings = []
    warning_keys = []

    score += _score_language_levels(
        requested_overlap_details,
        weights["requested_level_scores"],
    )
    reasons.append(
        f"Offers requested: {_format_overlap_details(requested_overlap_details)}"
    )

    if reverse_overlap:
        score += _score_language_levels(
            reverse_overlap_details,
            weights["reverse_level_scores"],
        )
        reasons.append(
            f"Mutual exchange: {_format_overlap_details(reverse_overlap_details)}"
        )
    else:
        reasons.append("One-way match only")

    if len(requested_overlap) > 1:
        extra_bonus = (len(requested_overlap) - 1) * weights["extra_requested_overlap"]
        score += extra_bonus
        reasons.append("Multiple requested languages overlap")

    if len(reverse_overlap) > 1:
        extra_bonus = (len(reverse_overlap) - 1) * weights["extra_reverse_overlap"]
        score += extra_bonus
        reasons.append("Multiple reverse languages overlap")

    if source_item.country_of_origin == candidate_item.country_of_origin:
        score -= weights["same_country_penalty"]
        warnings.append("Same country")
        warning_keys.append("same_country")

    gender_mismatch = (
        (source_item.same_gender_only or candidate_item.same_gender_only)
        and source_item.gender
        and candidate_item.gender
        and source_item.gender != candidate_item.gender
    )
    if gender_mismatch:
        score -= weights["gender_preference_mismatch_penalty"]
        warnings.append("Gender preference mismatch")
        warning_keys.append("gender_mismatch")

    if source_item.requested_native_only and _native_preference_unconfirmed(requested_overlap_details):
        score -= weights["native_preference_unconfirmed_penalty"]
        warnings.append("Requested native speaker not confirmed")
        warning_keys.append("native_unconfirmed")

    if candidate_item.requested_native_only and reverse_overlap and _native_preference_unconfirmed(reverse_overlap_details):
        score -= weights["native_preference_unconfirmed_penalty"]
        warnings.append("Candidate native speaker preference not confirmed")
        warning_keys.append("native_unconfirmed")

    if source_item.departure_date and candidate_item.departure_date:
        gap_days = abs((source_item.departure_date - candidate_item.departure_date).days)

        if gap_days >= gap_rules["large"]:
            score -= weights["departure_gap_large_penalty"]
            warnings.append("Large departure gap")
            warning_keys.append("departure_gap")
        elif gap_days >= gap_rules["medium"]:
            score -= weights["departure_gap_medium_penalty"]
            warnings.append("Departure gap")
            warning_keys.append("departure_gap")

    score = max(score, 0)

    if reverse_overlap and score >= thresholds["full"]:
        category = "full"
    elif score >= thresholds["partial"]:
        category = "partial"
    elif score >= thresholds["weak"]:
        category = "weak"
    else:
        return None

    best_requested_level = max(detail["level"] for detail in requested_overlap_details)
    if best_requested_level <= 1:
        category = _cap_category(category, "weak")
    elif best_requested_level <= 2:
        category = _cap_category(category, "partial")

    if source_item.requested_native_only and best_requested_level < 5:
        category = _cap_category(category, "partial")

    total_overlap_count = len(requested_overlap) + len(reverse_overlap)
    signal_level = min(
        config["signal"]["max_level"],
        max(1, round((total_overlap_count + best_requested_level) / 2)),
    )

    return {
        "candidate": candidate_item,
        "category": category,
        "score": score,
        "requested_overlap_codes": requested_overlap,
        "requested_overlap_labels": _labels_for_codes(requested_overlap, language_labels),
        "requested_overlap_details": requested_overlap_details,
        "reverse_overlap_codes": reverse_overlap,
        "reverse_overlap_labels": _labels_for_codes(reverse_overlap, language_labels),
        "reverse_overlap_details": reverse_overlap_details,
        "total_overlap_count": total_overlap_count,
        "best_requested_level": best_requested_level,
        "signal_level": signal_level,
        "reasons": reasons,
        "warnings": warnings,
        "warning_keys": warning_keys,
        "is_mutual": bool(reverse_overlap),
    }

def build_match_groups(source_item, candidate_items, language_labels, config=None):
    config = config or MATCH_CONFIG

    grouped = defaultdict(list)

    for candidate_item in candidate_items:
        match = evaluate_match(
            source_item=source_item,
            candidate_item=candidate_item,
            language_labels=language_labels,
            config=config,
        )
        if match is None:
            continue

        grouped[match["category"]].append(match)

    for category in ("full", "partial", "weak"):
        grouped[category].sort(
            key=lambda item: (
                -item["score"],
                -(item["candidate"].created_at.timestamp() if item["candidate"].created_at else 0),
                -item["total_overlap_count"],
                (item["candidate"].last_name or "").lower(),
                (item["candidate"].first_name or "").lower(),
            )
        )
        grouped[category] = grouped[category][:config["limits"][category]]

    return {
        "full": grouped["full"],
        "partial": grouped["partial"],
        "weak": grouped["weak"],
    }

def build_match_counts(source_items, candidate_items, language_labels, config=None):
    config = config or MATCH_CONFIG
    counts_by_id = {}

    for source_item in source_items:
        counts = {
            "full": 0,
            "partial": 0,
            "weak": 0,
            "total": 0,
        }

        for candidate_item in candidate_items:
            match = evaluate_match(
                source_item=source_item,
                candidate_item=candidate_item,
                language_labels=language_labels,
                config=config,
            )
            if match is None:
                continue

            counts[match["category"]] += 1
            counts["total"] += 1

        counts_by_id[source_item.id] = counts

    return counts_by_id
