from collections import defaultdict

MATCH_CONFIG = {
    "weights": {
        "requested_overlap": 60,
        "mutual_exchange_bonus": 35,
        "extra_requested_overlap": 10,
        "same_country_penalty": 15,
        "gender_preference_mismatch_penalty": 20,
        "native_preference_unconfirmed_penalty": 10,
        "departure_gap_medium_penalty": 8,
        "departure_gap_large_penalty": 15,
    },
    "thresholds": {
        "full": 90,
        "partial": 60,
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

def _labels_for_codes(codes, label_map):
    return [label_map.get(code, code) for code in codes]

def evaluate_match(source_item, candidate_item, language_labels, config=None):
    config = config or MATCH_CONFIG

    if source_item.id == candidate_item.id:
        return None

    source_requested = set(source_item.requested_languages_list)
    source_offered = set(source_item.offered_languages_list)

    candidate_requested = set(candidate_item.requested_languages_list)
    candidate_offered = set(candidate_item.offered_languages_list)

    requested_overlap = sorted(source_requested & candidate_offered)
    if not requested_overlap:
        return None

    reverse_overlap = sorted(candidate_requested & source_offered)

    weights = config["weights"]
    thresholds = config["thresholds"]
    gap_rules = config["departure_gap_days"]

    score = 0
    reasons = []
    warnings = []
    warning_keys = []

    score += weights["requested_overlap"]
    reasons.append(
        f"Offers requested: {', '.join(_labels_for_codes(requested_overlap, language_labels))}"
    )

    if reverse_overlap:
        score += weights["mutual_exchange_bonus"]
        reasons.append(
            f"Mutual exchange: {', '.join(_labels_for_codes(reverse_overlap, language_labels))}"
        )
    else:
        reasons.append("One-way match only")

    if len(requested_overlap) > 1:
        extra_bonus = (len(requested_overlap) - 1) * weights["extra_requested_overlap"]
        score += extra_bonus
        reasons.append("Multiple requested languages overlap")

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

    if source_item.requested_native_only or candidate_item.requested_native_only:
        score -= weights["native_preference_unconfirmed_penalty"]
        warnings.append("Native speaker preference not confirmed")
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

    total_overlap_count = len(requested_overlap) + len(reverse_overlap)
    signal_level = min(
        config["signal"]["max_level"],
        max(1, total_overlap_count),
    )

    return {
        "candidate": candidate_item,
        "category": category,
        "score": score,
        "requested_overlap_codes": requested_overlap,
        "requested_overlap_labels": _labels_for_codes(requested_overlap, language_labels),
        "reverse_overlap_codes": reverse_overlap,
        "reverse_overlap_labels": _labels_for_codes(reverse_overlap, language_labels),
        "total_overlap_count": total_overlap_count,
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
