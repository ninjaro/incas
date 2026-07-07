"""Unified Language Tandem admin API with progressive capabilities.

- language_tandem_blind: anonymized list and matching. Personal data is
  stripped on the server, never sent, and requests are addressed through an
  opaque HMAC reference instead of the database id.
- language_tandem_private: adds names, emails, and free-text fields.
- language_tandem_corrections: allows edits.
"""

import hashlib
import hmac

from flask import current_app, jsonify, request

from app.api import api_bp, api_error, get_json_body, require_capability, validation_error
from app.matching import build_match_groups
from app.models import LanguageTandemRequest, db
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
    items = LanguageTandemRequest.query.order_by(LanguageTandemRequest.created_at.desc()).all()
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
        return {
            "candidate": serialize_for_session(match["candidate"]),
            "category": match["category"],
            "score": match["score"],
            "reasons": match["reasons"],
            "warnings": match["warnings"],
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
