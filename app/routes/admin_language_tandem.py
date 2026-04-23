import json

from flask import abort, flash, redirect, render_template, request, url_for

from app.duplicate_review import (
    DUPLICATE_REVIEW_CONFIG,
    apply_merge_choice,
    build_duplicate_candidates,
    build_duplicate_merge_rows,
    canonicalize_duplicate_pair,
    get_older_and_newer_request,
)
from app.matching import MATCH_CONFIG, build_match_groups
from app.models import LanguageTandemRequest, TandemDuplicateDecision, db
from app.routes import bp
from app.routes.helpers.access import (
    has_tandem_correction_access,
    has_tandem_matching_access,
    require_scope,
    require_tandem_any_access,
)
from app.routes.helpers.tandem_admin import (
    annotate_tandem_match_counts,
    build_tandem_admin_context,
    get_safe_tandem_return_url,
    get_tandem_admin_filters,
    hydrate_tandem_request_display,
)
from app.routes.helpers.tandem_duplicates import (
    DUPLICATE_DECISION_LABELS,
    delete_duplicate_decisions_for_request,
    get_duplicate_decision_for_pair,
    get_duplicate_decision_map_for_request,
)
from app.routes.helpers.tandem_form import (
    build_tandem_form_values,
    get_country_label_map,
    get_language_label_map,
    normalize_country_code,
    normalize_language_codes,
    parse_birth_year,
    parse_departure_date,
    render_admin_language_tandem_edit_page,
)


@bp.route("/admin/language-tandem")
def admin_language_tandem():
    guard = require_tandem_any_access()
    if guard:
        return guard

    allow_duplicate_filters = has_tandem_correction_access()
    filters = get_tandem_admin_filters(
        request.args,
        allow_duplicate_filters=allow_duplicate_filters,
    )

    context = build_tandem_admin_context(
        filters,
        allow_duplicate_filters=allow_duplicate_filters,
    )

    return render_template(
        "admin/language_tandem/index.html",
        **context,
        can_open_matching=has_tandem_matching_access(),
        can_edit_requests=has_tandem_correction_access(),
    )

@bp.route("/admin/language-tandem/<int:request_id>/edit", methods=["GET", "POST"])
def admin_language_tandem_edit(request_id):
    guard = require_scope("language_tandem_corrections")
    if guard:
        return guard

    item = LanguageTandemRequest.query.get_or_404(request_id)
    return_to = get_safe_tandem_return_url(
        request.form.get("return_to") or request.args.get("return_to")
    )

    if request.method == "POST":
        values = {
            "first_name": request.form.get("first_name", "").strip(),
            "last_name": request.form.get("last_name", "").strip(),
            "email": request.form.get("email", "").strip(),
            "occupation": request.form.get("occupation", "").strip(),
            "occupation_other": request.form.get("occupation_other", "").strip(),
            "gender": request.form.get("gender", "").strip(),
            "birth_year": request.form.get("birth_year", "").strip(),
            "departure_date": request.form.get("departure_date", "").strip(),
            "country_of_origin": normalize_country_code(request.form.get("country_of_origin")),
            "offered_languages": normalize_language_codes(request.form.getlist("offered_languages")),
            "offered_native_languages": [],
            "offered_language_levels": {},
            "requested_languages": normalize_language_codes(request.form.getlist("requested_languages")),
            "requested_native_only": request.form.get("requested_native_only") == "on",
            "same_gender_only": request.form.get("same_gender_only") == "on",
            "comment": request.form.get("comment", "").strip(),
        }

        valid_levels = {"1", "2", "3", "4", "5"}
        try:
            raw_levels = json.loads(request.form.get("offered_language_levels", "{}"))
            raw_levels = raw_levels if isinstance(raw_levels, dict) else {}
        except (TypeError, ValueError):
            raw_levels = {}
        valid_offered = set(values["offered_languages"])
        offered_language_levels = {
            k: v for k, v in raw_levels.items()
            if k in valid_offered and v in valid_levels
        }
        values["offered_language_levels"] = offered_language_levels

        offered_native_languages = [
            code for code in values["offered_languages"]
            if offered_language_levels.get(code) == "5"
        ]
        values["offered_native_languages"] = offered_native_languages

        birth_year = parse_birth_year(values["birth_year"])
        departure_date = parse_departure_date(values["departure_date"])

        resolved_occupation = (
            values["occupation_other"]
            if values["occupation"] == "other"
            else values["occupation"]
        )

        if not values["first_name"] or not values["last_name"] or not values["email"]:
            flash("First name, last name, and email are required.")
            return render_admin_language_tandem_edit_page(item, values, return_to)

        if not values["occupation"] or not values["gender"] or not values["country_of_origin"]:
            flash("Occupation, gender, and country of origin are required.")
            return render_admin_language_tandem_edit_page(item, values, return_to)

        if values["occupation"] == "other" and not values["occupation_other"]:
            flash("Enter occupation.")
            return render_admin_language_tandem_edit_page(item, values, return_to)

        if birth_year is None:
            flash("Enter a valid birth year.")
            return render_admin_language_tandem_edit_page(item, values, return_to)

        if departure_date is None:
            flash("Enter a valid departure date.")
            return render_admin_language_tandem_edit_page(item, values, return_to)

        if not values["offered_languages"]:
            flash("Select at least one offered language.")
            return render_admin_language_tandem_edit_page(item, values, return_to)

        if not values["requested_languages"]:
            flash("Select at least one requested language.")
            return render_admin_language_tandem_edit_page(item, values, return_to)

        item.first_name = values["first_name"]
        item.last_name = values["last_name"]
        item.email = values["email"]
        item.occupation = resolved_occupation
        item.gender = values["gender"]
        item.birth_year = birth_year
        item.departure_date = departure_date
        item.country_of_origin = values["country_of_origin"]
        item.offered_languages = json.dumps(values["offered_languages"])
        item.offered_native_languages = json.dumps(offered_native_languages)
        item.offered_language_levels = json.dumps(offered_language_levels)
        item.requested_languages = json.dumps(values["requested_languages"])
        item.requested_native_only = values["requested_native_only"]
        item.same_gender_only = values["same_gender_only"]
        item.comment = values["comment"]

        db.session.commit()

        flash("Request updated.")
        return redirect(return_to)

    values = build_tandem_form_values(item)
    return render_admin_language_tandem_edit_page(item, values, return_to)

@bp.route("/admin/language-tandem/mark-filtered-viewed", methods=["POST"])
def admin_language_tandem_mark_filtered_viewed():
    guard = require_tandem_any_access()
    if guard:
        return guard

    allow_duplicate_filters = has_tandem_correction_access()
    filters = get_tandem_admin_filters(
        request.form,
        allow_duplicate_filters=allow_duplicate_filters,
    )

    context = build_tandem_admin_context(
        filters,
        allow_duplicate_filters=allow_duplicate_filters,
    )

    changed_count = 0

    for item in context["filtered_items"]:
        if not item.is_viewed:
            item.is_viewed = True
            changed_count += 1

    if changed_count:
        db.session.commit()
        flash(f"Marked {changed_count} filtered request(s) as viewed.")
    else:
        flash("No filtered unviewed requests to update.")

    return redirect(get_safe_tandem_return_url(request.form.get("return_to")))

@bp.route("/admin/language-tandem/<int:request_id>/toggle-viewed", methods=["POST"])
def admin_language_tandem_toggle_viewed(request_id):
    guard = require_tandem_any_access()
    if guard:
        return guard

    item = LanguageTandemRequest.query.get_or_404(request_id)
    item.is_viewed = not item.is_viewed
    db.session.commit()

    return redirect(get_safe_tandem_return_url(request.form.get("return_to")))

@bp.route("/admin/language-tandem/<int:request_id>")
def admin_language_tandem_detail(request_id):
    guard = require_scope("language_tandem")
    if guard:
        return guard

    item = LanguageTandemRequest.query.get_or_404(request_id)
    return_to = get_safe_tandem_return_url(request.args.get("return_to"))
    auto_marked_viewed = not item.is_viewed

    if not item.is_viewed:
        item.is_viewed = True
        db.session.commit()

    country_labels = get_country_label_map()
    language_labels = get_language_label_map()

    hydrate_tandem_request_display(item, country_labels=country_labels)

    candidate_items = (
        LanguageTandemRequest.query
        .filter(LanguageTandemRequest.id != item.id)
        .order_by(LanguageTandemRequest.created_at.desc())
        .all()
    )

    for candidate in candidate_items:
        hydrate_tandem_request_display(candidate, country_labels=country_labels)

    all_match_items = [item, *candidate_items]
    annotate_tandem_match_counts(
        all_match_items,
        candidate_items=all_match_items,
        language_labels=language_labels,
    )

    match_groups = build_match_groups(
        source_item=item,
        candidate_items=candidate_items,
        language_labels=language_labels,
        config=MATCH_CONFIG,
    )

    return render_template(
        "admin/language_tandem/detail.html",
        item=item,
        match_groups=match_groups,
        match_limits=MATCH_CONFIG["limits"],
        auto_marked_viewed=auto_marked_viewed,
        return_to=return_to,
        can_edit_requests=has_tandem_correction_access(),
    )

@bp.route("/admin/language-tandem/<int:request_id>/duplicates")
def admin_language_tandem_duplicates(request_id):
    guard = require_scope("language_tandem_corrections")
    if guard:
        return guard

    item = LanguageTandemRequest.query.get_or_404(request_id)
    return_to = get_safe_tandem_return_url(request.args.get("return_to"))

    country_labels = get_country_label_map()
    language_labels = get_language_label_map()

    hydrate_tandem_request_display(item, country_labels=country_labels)

    candidate_items = (
        LanguageTandemRequest.query
        .filter(LanguageTandemRequest.id != item.id)
        .order_by(LanguageTandemRequest.created_at.desc())
        .all()
    )

    for candidate in candidate_items:
        hydrate_tandem_request_display(candidate, country_labels=country_labels)

    decision_map = get_duplicate_decision_map_for_request(item.id)

    duplicate_candidates = build_duplicate_candidates(
        source_item=item,
        candidate_items=candidate_items,
        config=DUPLICATE_REVIEW_CONFIG,
    )

    for entry in duplicate_candidates:
        pair_key = canonicalize_duplicate_pair(item.id, entry["candidate"].id)
        decision = decision_map.get(pair_key)

        entry["decision"] = decision.decision if decision else ""
        entry["decision_label"] = DUPLICATE_DECISION_LABELS.get(entry["decision"], "")
        entry["is_suppressed"] = bool(decision)

    active_candidates = [entry for entry in duplicate_candidates if not entry["is_suppressed"]]
    suppressed_candidates = [entry for entry in duplicate_candidates if entry["is_suppressed"]]

    selected_candidate_id = request.args.get("candidate_id", type=int)

    selected_entry = None
    if selected_candidate_id is not None:
        selected_entry = next(
            (entry for entry in duplicate_candidates if entry["candidate"].id == selected_candidate_id),
            None,
        )

    if selected_entry is None:
        selected_entry = active_candidates[0] if active_candidates else None

    diff_rows = []
    unchanged_count = 0
    older_item = None
    newer_item = None

    if selected_entry is not None:
        older_item, newer_item = get_older_and_newer_request(item, selected_entry["candidate"])
        diff_rows, unchanged_count = build_duplicate_merge_rows(
            older_item=older_item,
            newer_item=newer_item,
            country_labels=country_labels,
            language_labels=language_labels,
        )

    return render_template(
        "admin/language_tandem/duplicates.html",
        item=item,
        active_candidates=active_candidates,
        suppressed_candidates=suppressed_candidates,
        selected_entry=selected_entry,
        diff_rows=diff_rows,
        unchanged_count=unchanged_count,
        older_item=older_item,
        newer_item=newer_item,
        return_to=return_to,
    )

@bp.route("/admin/language-tandem/<int:request_id>/duplicates/decision", methods=["POST"])
def admin_language_tandem_duplicate_decision(request_id):
    guard = require_scope("language_tandem_corrections")
    if guard:
        return guard

    item = LanguageTandemRequest.query.get_or_404(request_id)
    candidate_id = request.form.get("candidate_id", type=int)
    decision_value = (request.form.get("decision") or "").strip()

    if candidate_id is None:
        abort(400)

    candidate = LanguageTandemRequest.query.get_or_404(candidate_id)

    if decision_value not in {"ignore", "different"}:
        abort(400)

    left_id, right_id = canonicalize_duplicate_pair(item.id, candidate.id)

    decision = get_duplicate_decision_for_pair(left_id, right_id)
    if decision is None:
        decision = TandemDuplicateDecision(
            left_request_id=left_id,
            right_request_id=right_id,
        )

    decision.decision = decision_value
    db.session.add(decision)
    db.session.commit()

    flash(f"Duplicate review saved: {DUPLICATE_DECISION_LABELS[decision_value]}.")
    return redirect(
        url_for(
            "main.admin_language_tandem_duplicates",
            request_id=item.id,
            candidate_id=candidate.id,
            return_to=get_safe_tandem_return_url(request.form.get("return_to")),
        )
    )

@bp.route("/admin/language-tandem/<int:request_id>/duplicates/decision/clear", methods=["POST"])
def admin_language_tandem_duplicate_decision_clear(request_id):
    guard = require_scope("language_tandem_corrections")
    if guard:
        return guard

    item = LanguageTandemRequest.query.get_or_404(request_id)
    candidate_id = request.form.get("candidate_id", type=int)

    if candidate_id is None:
        abort(400)

    left_id, right_id = canonicalize_duplicate_pair(item.id, candidate_id)
    decision = get_duplicate_decision_for_pair(left_id, right_id)

    if decision is not None:
        db.session.delete(decision)
        db.session.commit()
        flash("Duplicate review cleared.")

    return redirect(
        url_for(
            "main.admin_language_tandem_duplicates",
            request_id=item.id,
            candidate_id=candidate_id,
            return_to=get_safe_tandem_return_url(request.form.get("return_to")),
        )
    )

@bp.route("/admin/language-tandem/<int:request_id>/duplicates/merge", methods=["GET", "POST"])
def admin_language_tandem_duplicate_merge(request_id):
    guard = require_scope("language_tandem_corrections")
    if guard:
        return guard

    item = LanguageTandemRequest.query.get_or_404(request_id)
    return_to = get_safe_tandem_return_url(
        request.form.get("return_to") or request.args.get("return_to")
    )

    candidate_id = request.form.get("candidate_id", type=int) or request.args.get("candidate_id", type=int)
    if candidate_id is None:
        flash("Select a duplicate candidate first.")
        return redirect(url_for("main.admin_language_tandem_duplicates", request_id=item.id, return_to=return_to))

    candidate = LanguageTandemRequest.query.get_or_404(candidate_id)

    country_labels = get_country_label_map()
    language_labels = get_language_label_map()

    older_item, newer_item = get_older_and_newer_request(item, candidate)

    hydrate_tandem_request_display(older_item, country_labels=country_labels)
    hydrate_tandem_request_display(newer_item, country_labels=country_labels)

    merge_rows, unchanged_count = build_duplicate_merge_rows(
        older_item=older_item,
        newer_item=newer_item,
        country_labels=country_labels,
        language_labels=language_labels,
    )

    if request.method == "POST":
        selected_choices = {}

        for row in merge_rows:
            field_name = row["name"]
            choice = (request.form.get(f"merge_choice_{field_name}") or "").strip()
            valid_choices = {option["value"] for option in row["choices"]}

            if choice not in valid_choices:
                flash("Resolve all conflicts before merging.")
                return render_template(
                    "admin/language_tandem/duplicate_merge.html",
                    source_item=item,
                    older_item=older_item,
                    newer_item=newer_item,
                    merge_rows=merge_rows,
                    unchanged_count=unchanged_count,
                    selected_choices=selected_choices,
                    return_to=return_to,
                    candidate_id=candidate.id,
                )

            selected_choices[field_name] = choice

        for row in merge_rows:
            apply_merge_choice(
                newer_item=newer_item,
                older_item=older_item,
                field_name=row["name"],
                choice=selected_choices[row["name"]],
            )

        newer_item.is_viewed = newer_item.is_viewed or older_item.is_viewed

        delete_duplicate_decisions_for_request(older_item.id)
        db.session.delete(older_item)
        db.session.commit()

        flash(f"Requests merged into #{newer_item.id}.")
        return redirect(return_to)

    selected_choices = {
        row["name"]: row["default_choice"]
        for row in merge_rows
    }

    return render_template(
        "admin/language_tandem/duplicate_merge.html",
        source_item=item,
        older_item=older_item,
        newer_item=newer_item,
        merge_rows=merge_rows,
        unchanged_count=unchanged_count,
        selected_choices=selected_choices,
        return_to=return_to,
        candidate_id=candidate.id,
    )
