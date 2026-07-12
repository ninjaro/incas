"""Unified Language Tandem admin API with progressive capabilities.

- language_tandem_blind: anonymized list and matching. Personal data is
  stripped on the server, never sent, and requests are addressed through an
  opaque HMAC reference instead of the database id.
- language_tandem_private: adds names, emails, and free-text fields.
- language_tandem_corrections: allows edits.
"""

import hashlib
import hmac
import json
from datetime import datetime

from flask import current_app, jsonify, request

from app.api import api_bp, api_error, get_json_body, require_capability, validation_error
from app.matching import build_match_groups
from app.duplicate_review import build_duplicate_candidates, canonicalize_duplicate_pair
from app.models import (
    LanguageTandemRequest,
    TandemDuplicateDecision,
    TandemMatchReviewState,
    db,
)
from app.routes.helpers.access import has_capability
from app.routes.helpers.tandem_form import get_language_label_map

BLIND_REF_LENGTH = 16


def blind_ref(request_id):
    secret = current_app.config["SECRET_KEY"].encode("utf-8")
    digest = hmac.new(secret, f"tandem:{request_id}".encode("utf-8"), hashlib.sha256)
    return digest.hexdigest()[:BLIND_REF_LENGTH]


def resolve_blind_ref(ref):
    if not ref:
        return None
    for (request_id,) in db.session.query(LanguageTandemRequest.id).all():
        if hmac.compare_digest(blind_ref(request_id), ref):
            return db.session.get(LanguageTandemRequest, request_id)
    return None


def serialize_blind(item):
    return {
        "ref": blind_ref(item.id),
        "gender": item.gender,
        "birthYear": item.birth_year,
        "occupation": item.occupation,
        "countryOfOrigin": item.country_of_origin,
        "departureDate": item.departure_date.isoformat() if item.departure_date else None,
        "offeredLanguages": item.offered_languages_list,
        "offeredNativeLanguages": item.offered_native_languages_list,
        "offeredLanguageLevels": item.offered_language_levels_dict,
        "requestedLanguages": item.requested_languages_list,
        "requestedNativeOnly": bool(item.requested_native_only),
        "sameGenderOnly": bool(item.same_gender_only),
        "preferredGender": item.preferred_gender,
        "isViewed": bool(item.is_viewed),
        "createdAt": item.created_at.isoformat() if item.created_at else None,
    }


def serialize_private(item):
    payload = serialize_blind(item)
    payload.update(
        {
            "id": item.id,
            "firstName": item.first_name,
            "lastName": item.last_name,
            "email": item.email,
            "comment": item.comment,
        }
    )
    return payload


def serialize_for_session(item):
    if has_capability("language_tandem_private"):
        return serialize_private(item)
    return serialize_blind(item)


@api_bp.get("/admin/language-tandem")
@require_capability("language_tandem_blind")
def api_admin_tandem_list():
    query = LanguageTandemRequest.query
    viewed = request.args.get("viewed", "").strip().lower()
    if viewed == "yes":
        query = query.filter(LanguageTandemRequest.is_viewed.is_(True))
    elif viewed == "no":
        query = query.filter(LanguageTandemRequest.is_viewed.is_(False))
    search = request.args.get("q", "").strip().lower()
    items = query.order_by(LanguageTandemRequest.created_at.desc()).all()
    if search and has_capability("language_tandem_private"):
        items = [
            item for item in items
            if search in f"{item.id} {item.first_name} {item.last_name} {item.email}".lower()
        ]
    return jsonify(
        {
            "items": [serialize_for_session(item) for item in items],
            "capabilities": {
                "private": has_capability("language_tandem_private"),
                "corrections": has_capability("language_tandem_corrections"),
            },
        }
    )


@api_bp.get("/admin/language-tandem/<ref>")
@require_capability("language_tandem_blind")
def api_admin_tandem_detail(ref):
    item = resolve_blind_ref(ref)
    if item is None:
        return api_error("not_found", "Request not found.", status=404)
    return jsonify(serialize_for_session(item))


@api_bp.get("/admin/language-tandem/<ref>/matches")
@require_capability("language_tandem_blind")
def api_admin_tandem_matches(ref):
    item = resolve_blind_ref(ref)
    if item is None:
        return api_error("not_found", "Request not found.", status=404)

    candidates = LanguageTandemRequest.query.filter(LanguageTandemRequest.id != item.id).all()
    groups = build_match_groups(item, candidates, get_language_label_map())

    def serialize_match(match):
        candidate = match["candidate"]
        review = TandemMatchReviewState.query.filter_by(
            source_request_id=item.id,
            candidate_request_id=candidate.id,
        ).first()
        return {
            "candidate": serialize_for_session(candidate),
            "category": match["category"],
            "score": match["score"],
            "reasons": match["reasons"],
            "warnings": match["warnings"],
            "review": {
                "hidden": bool(review and review.is_hidden),
                "shortlisted": bool(review and review.is_shortlisted),
                "contactedAt": review.contacted_at.isoformat() if review and review.contacted_at else None,
                "finalPairAt": review.final_pair_at.isoformat() if review and review.final_pair_at else None,
            },
        }

    return jsonify(
        {
            "source": serialize_for_session(item),
            "groups": {
                category: [serialize_match(match) for match in matches]
                for category, matches in groups["groups"].items()
            },
            "totals": groups["totals"],
        }
    )


EDITABLE_TEXT_FIELDS = {
    "firstName": "first_name",
    "lastName": "last_name",
    "email": "email",
    "occupation": "occupation",
    "gender": "gender",
    "countryOfOrigin": "country_of_origin",
    "comment": "comment",
    "preferredGender": "preferred_gender",
}


@api_bp.put("/admin/language-tandem/<ref>")
@require_capability("language_tandem_corrections")
def api_admin_tandem_update(ref):
    item = resolve_blind_ref(ref)
    if item is None:
        return api_error("not_found", "Request not found.", status=404)

    body = get_json_body()
    errors = {}

    for source, attr in EDITABLE_TEXT_FIELDS.items():
        if source in body:
            value = (body.get(source) or "").strip()
            if attr in ("first_name", "last_name", "email") and not value:
                errors[source] = "This field cannot be empty."
            else:
                setattr(item, attr, value)

    if "birthYear" in body:
        try:
            item.birth_year = int(body.get("birthYear"))
        except (TypeError, ValueError):
            errors["birthYear"] = "Enter a valid year."

    if "isViewed" in body:
        item.is_viewed = bool(body.get("isViewed"))

    if errors:
        db.session.rollback()
        return validation_error(errors)

    db.session.commit()
    return jsonify(serialize_for_session(item))


@api_bp.post("/admin/language-tandem/<ref>/viewed")
@require_capability("language_tandem_blind")
def api_admin_tandem_mark_viewed(ref):
    item = resolve_blind_ref(ref)
    if item is None:
        return api_error("not_found", "Request not found.", status=404)
    item.is_viewed = bool(get_json_body().get("isViewed", True))
    db.session.commit()
    return jsonify({"ref": ref, "isViewed": item.is_viewed})


@api_bp.post("/admin/language-tandem/<source_ref>/matches/<candidate_ref>/review")
@require_capability("language_tandem_blind")
def api_admin_tandem_match_review(source_ref, candidate_ref):
    source = resolve_blind_ref(source_ref)
    candidate = resolve_blind_ref(candidate_ref)
    if source is None or candidate is None or source.id == candidate.id:
        return api_error("not_found", "Match pair not found.", status=404)
    body = get_json_body()
    action = (body.get("action") or "").strip()
    if action in {"contacted", "final_pair"} and not has_capability("language_tandem_private"):
        return api_error("capability_required", "Contact workflow needs private Tandem access.", status=403)
    if action not in {"hide", "show", "shortlist", "unshortlist", "contacted", "uncontacted", "final_pair", "unpair"}:
        return validation_error({"action": "Unknown review action."})

    state = TandemMatchReviewState.query.filter_by(
        source_request_id=source.id,
        candidate_request_id=candidate.id,
    ).first()
    if state is None:
        state = TandemMatchReviewState(source_request_id=source.id, candidate_request_id=candidate.id)
        db.session.add(state)
    if action == "hide":
        state.is_hidden = True
    elif action == "show":
        state.is_hidden = False
    elif action == "shortlist":
        state.is_shortlisted = True
    elif action == "unshortlist":
        state.is_shortlisted = False
    elif action == "contacted":
        state.contacted_at = datetime.utcnow()
    elif action == "uncontacted":
        state.contacted_at = None
    elif action == "final_pair":
        state.final_pair_at = datetime.utcnow()
        state.is_shortlisted = True
    elif action == "unpair":
        state.final_pair_at = None
    db.session.commit()
    return jsonify(
        {
            "hidden": bool(state.is_hidden),
            "shortlisted": bool(state.is_shortlisted),
            "contactedAt": state.contacted_at.isoformat() if state.contacted_at else None,
            "finalPairAt": state.final_pair_at.isoformat() if state.final_pair_at else None,
        }
    )


@api_bp.get("/admin/language-tandem/duplicates")
@require_capability("language_tandem_corrections")
def api_admin_tandem_duplicates():
    items = LanguageTandemRequest.query.order_by(LanguageTandemRequest.created_at.desc()).all()
    results = []
    seen = set()
    for source in items:
        for candidate in build_duplicate_candidates(source, items):
            other = candidate["candidate"]
            pair = canonicalize_duplicate_pair(source.id, other.id)
            if pair in seen:
                continue
            seen.add(pair)
            decision = TandemDuplicateDecision.query.filter_by(
                left_request_id=pair[0], right_request_id=pair[1]
            ).first()
            results.append(
                {
                    "left": serialize_private(source),
                    "right": serialize_private(other),
                    "category": candidate["category"],
                    "score": candidate["score"],
                    "reasons": candidate["reasons"],
                    "decision": decision.decision if decision else None,
                }
            )
    return jsonify({"items": results})


@api_bp.post("/admin/language-tandem/duplicates/decision")
@require_capability("language_tandem_corrections")
def api_admin_tandem_duplicate_decision():
    body = get_json_body()
    left = resolve_blind_ref((body.get("leftRef") or "").strip())
    right = resolve_blind_ref((body.get("rightRef") or "").strip())
    decision_value = (body.get("decision") or "").strip()
    if left is None or right is None or left.id == right.id:
        return api_error("not_found", "Duplicate pair not found.", status=404)
    if decision_value not in {"ignore", "different"}:
        return validation_error({"decision": "Use ignore or different."})
    left_id, right_id = canonicalize_duplicate_pair(left.id, right.id)
    decision = TandemDuplicateDecision.query.filter_by(
        left_request_id=left_id, right_request_id=right_id
    ).first()
    if decision is None:
        decision = TandemDuplicateDecision(left_request_id=left_id, right_request_id=right_id)
        db.session.add(decision)
    decision.decision = decision_value
    decision.note = (body.get("note") or "").strip()
    db.session.commit()
    return jsonify({"decision": decision.decision, "note": decision.note})


@api_bp.post("/admin/language-tandem/duplicates/merge")
@require_capability("language_tandem_corrections")
def api_admin_tandem_duplicate_merge():
    body = get_json_body()
    keep = resolve_blind_ref((body.get("keepRef") or "").strip())
    remove = resolve_blind_ref((body.get("removeRef") or "").strip())
    if keep is None or remove is None or keep.id == remove.id:
        return api_error("not_found", "Duplicate pair not found.", status=404)
    fields = body.get("fields") if isinstance(body.get("fields"), dict) else {}
    editable = {
        "firstName": "first_name", "lastName": "last_name", "email": "email",
        "occupation": "occupation", "gender": "gender", "birthYear": "birth_year",
        "departureDate": "departure_date", "countryOfOrigin": "country_of_origin",
        "requestedNativeOnly": "requested_native_only", "sameGenderOnly": "same_gender_only",
        "preferredGender": "preferred_gender", "comment": "comment",
    }
    for source, attr in editable.items():
        choice = fields.get(source, "keep")
        if choice == "remove":
            setattr(keep, attr, getattr(remove, attr))
        elif choice == "append" and attr == "comment":
            keep.comment = "\n\n".join(part for part in (keep.comment, remove.comment) if part)
    for source, attr in (("offeredLanguages", "offered_languages"), ("offeredNativeLanguages", "offered_native_languages"), ("offeredLanguageLevels", "offered_language_levels"), ("requestedLanguages", "requested_languages")):
        if fields.get(source) == "remove":
            setattr(keep, attr, getattr(remove, attr))

    review_states = TandemMatchReviewState.query.filter(
        (TandemMatchReviewState.source_request_id == remove.id)
        | (TandemMatchReviewState.candidate_request_id == remove.id)
    ).all()
    for state in review_states:
        source_id = keep.id if state.source_request_id == remove.id else state.source_request_id
        candidate_id = keep.id if state.candidate_request_id == remove.id else state.candidate_request_id
        if source_id == candidate_id:
            db.session.delete(state)
            continue
        existing = TandemMatchReviewState.query.filter_by(
            source_request_id=source_id,
            candidate_request_id=candidate_id,
        ).first()
        if existing is not None and existing.id != state.id:
            existing.is_hidden = existing.is_hidden or state.is_hidden
            existing.is_shortlisted = existing.is_shortlisted or state.is_shortlisted
            existing.contacted_at = max(
                (value for value in (existing.contacted_at, state.contacted_at) if value),
                default=None,
            )
            existing.final_pair_at = max(
                (value for value in (existing.final_pair_at, state.final_pair_at) if value),
                default=None,
            )
            db.session.delete(state)
        else:
            state.source_request_id = source_id
            state.candidate_request_id = candidate_id

    decisions = TandemDuplicateDecision.query.filter(
        (TandemDuplicateDecision.left_request_id == remove.id)
        | (TandemDuplicateDecision.right_request_id == remove.id)
    ).all()
    for decision in decisions:
        other_id = (
            decision.right_request_id
            if decision.left_request_id == remove.id
            else decision.left_request_id
        )
        if other_id == keep.id:
            db.session.delete(decision)
            continue
        left_id, right_id = canonicalize_duplicate_pair(keep.id, other_id)
        existing = TandemDuplicateDecision.query.filter_by(
            left_request_id=left_id,
            right_request_id=right_id,
        ).first()
        if existing is not None and existing.id != decision.id:
            if decision.updated_at >= existing.updated_at:
                existing.decision = decision.decision
                existing.note = decision.note
            db.session.delete(decision)
        else:
            decision.left_request_id = left_id
            decision.right_request_id = right_id
    db.session.delete(remove)
    db.session.commit()
    return jsonify(serialize_private(keep))
