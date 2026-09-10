import json
import re

from flask import jsonify, request
from sqlalchemy import func, or_

from app.api import api_bp, api_error, get_json_body, rate_limited, require_capability, validation_error
from app.datetime_utils import serialize_utc, utc_now
from app.models import ContactRequest, EventSuggestion, LanguageTandemRequest, db
from app.routes.helpers.access import has_capability
from app.routes.helpers.tandem_form import (
    get_country_options,
    get_language_label_map,
    get_occupation_choices,
    normalize_country_code,
    normalize_language_codes,
    parse_departure_date,
)

RESOLVED_FORM_STATUSES = {"resolved", "archived"}


def _mask_email(value):
    value = value or ""
    if "@" not in value:
        return ""
    return f"…@{value.split('@', 1)[1]}"


EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
def _email_is_valid(value):
    return bool(EMAIL_RE.match(value or ""))


@api_bp.get("/public/forms/options")
def api_public_form_options():
    languages = get_language_label_map()
    return jsonify(
        {
            "countries": get_country_options(),
            "languages": [
                {"code": code, "label": label}
                for code, label in sorted(languages.items(), key=lambda item: item[1].casefold())
            ],
            "occupations": [*get_occupation_choices(), "other"],
            "languageLevels": [
                {"value": str(level), "label": label}
                for level, label in (
                    (1, "Beginner"),
                    (2, "Elementary"),
                    (3, "Intermediate"),
                    (4, "Advanced"),
                    (5, "Native / near-native"),
                )
            ],
        }
    )


@api_bp.post("/public/contact")
@rate_limited("form.contact", limit=20)
def api_public_contact_submit():
    body = get_json_body()
    values = {
        "name": (body.get("name") or "").strip(),
        "email": (body.get("email") or "").strip(),
        "subject": (body.get("subject") or "").strip(),
        "message": (body.get("message") or "").strip(),
    }
    errors = {}
    if not values["name"]:
        errors["name"] = "Name is required."
    if not _email_is_valid(values["email"]):
        errors["email"] = "Enter a valid email address."
    if not values["message"]:
        errors["message"] = "Message is required."
    if errors:
        return validation_error(errors)

    item = ContactRequest(
        name=values["name"][:160],
        email=values["email"][:255],
        subject=values["subject"][:200],
        message=values["message"][:10000],
    )
    db.session.add(item)
    db.session.commit()
    return jsonify({"submissionId": f"CON-{item.id:06d}"}), 201


@api_bp.post("/public/event-suggestions")
@rate_limited("form.event_suggestion", limit=20)
def api_public_event_suggestion_submit():
    body = get_json_body()
    values = {
        "kind": (body.get("kind") or "").strip(),
        "country": (body.get("country") or "").strip(),
        "contactName": (body.get("contactName") or "").strip(),
        "contactEmail": (body.get("contactEmail") or "").strip(),
        "contactPhone": (body.get("contactPhone") or "").strip(),
        "comment": (body.get("comment") or "").strip(),
    }
    errors = {}
    if values["kind"] not in {"country_evening", "breakfast"}:
        errors["kind"] = "Select a valid event type."
    if not values["country"]:
        errors["country"] = "Country or culture is required."
    if not values["contactName"]:
        errors["contactName"] = "Contact name is required."
    if not values["contactEmail"] and not values["contactPhone"]:
        errors["contactEmail"] = "Enter an email address or phone number."
        errors["contactPhone"] = "Enter an email address or phone number."
    elif values["contactEmail"] and not _email_is_valid(values["contactEmail"]):
        errors["contactEmail"] = "Enter a valid email address."
    if errors:
        return validation_error(errors)

    item = EventSuggestion(
        kind=values["kind"],
        country=values["country"][:120],
        contact_name=values["contactName"][:160],
        contact_email=values["contactEmail"][:255],
        contact_phone=values["contactPhone"][:80],
        comment=values["comment"][:10000],
    )
    db.session.add(item)
    db.session.commit()
    return jsonify({"submissionId": f"SUG-{item.id:06d}"}), 201


@api_bp.post("/public/language-tandem")
@rate_limited("form.language_tandem", limit=10)
def api_public_tandem_submit():
    body = get_json_body()
    values = {
        "firstName": (body.get("firstName") or "").strip(),
        "lastName": (body.get("lastName") or "").strip(),
        "email": (body.get("email") or "").strip(),
        "occupation": (body.get("occupation") or "").strip(),
        "occupationOther": (body.get("occupationOther") or "").strip(),
        "gender": (body.get("gender") or "").strip(),
        "countryOfOrigin": normalize_country_code(body.get("countryOfOrigin")),
        "offeredLanguages": normalize_language_codes(body.get("offeredLanguages") or []),
        "requestedLanguages": normalize_language_codes(body.get("requestedLanguages") or []),
        "requestedNativeOnly": bool(body.get("requestedNativeOnly")),
        "sameGenderOnly": bool(body.get("sameGenderOnly")),
        "comment": (body.get("comment") or "").strip(),
    }
    departure_date = parse_departure_date(str(body.get("departureDate") or ""))
    errors = {}
    for field in ("firstName", "lastName", "gender"):
        if not values[field]:
            errors[field] = "This field is required."
    if not _email_is_valid(values["email"]):
        errors["email"] = "Enter a valid email address."
    if values["occupation"] == "other" and not values["occupationOther"]:
        errors["occupationOther"] = "Enter your occupation."
    if not values["countryOfOrigin"]:
        errors["countryOfOrigin"] = "Select your country of origin."
    if departure_date is None:
        errors["departureDate"] = "Enter a valid departure date."
    if not values["offeredLanguages"]:
        errors["offeredLanguages"] = "Select at least one language you offer."
    if not values["requestedLanguages"]:
        errors["requestedLanguages"] = "Select at least one language you request."

    raw_levels = body.get("offeredLanguageLevels")
    raw_levels = raw_levels if isinstance(raw_levels, dict) else {}
    valid_levels = {"1", "2", "3", "4", "5"}
    levels = {
        code: str(raw_levels.get(code))
        for code in values["offeredLanguages"]
        if str(raw_levels.get(code)) in valid_levels
    }
    for code in values["offeredLanguages"]:
        if code not in levels:
            errors[f"offeredLanguageLevels.{code}"] = "Select your level."
    if errors:
        return validation_error(errors)

    occupation = values["occupationOther"] if values["occupation"] == "other" else values["occupation"]
    native_languages = [code for code, level in levels.items() if level == "5"]
    item = LanguageTandemRequest(
        first_name=values["firstName"][:120],
        last_name=values["lastName"][:120],
        email=values["email"][:255],
        occupation=occupation[:120],
        gender=values["gender"][:40],
        departure_date=departure_date,
        country_of_origin=values["countryOfOrigin"],
        offered_languages=json.dumps(values["offeredLanguages"]),
        offered_native_languages=json.dumps(native_languages),
        offered_language_levels=json.dumps(levels),
        requested_languages=json.dumps(values["requestedLanguages"]),
        requested_native_only=values["requestedNativeOnly"],
        same_gender_only=values["sameGenderOnly"],
        comment=values["comment"][:10000],
    )
    db.session.add(item)
    db.session.commit()
    return jsonify({"submissionId": f"TAN-{item.id:06d}"}), 201


def _serialize_contact(item, *, full=True):
    payload = {
        "type": "contact",
        "id": item.id,
        "publicId": f"CON-{item.id:06d}",
        "phone": "",
        "subject": item.subject,
        "kind": "",
        "status": item.status,
        "isViewed": bool(item.is_viewed),
        "resolvedAt": serialize_utc(item.resolved_at),
        "createdAt": serialize_utc(item.created_at),
        "redacted": not full,
    }
    if full:
        payload.update({"name": item.name, "email": item.email, "message": item.message})
    else:
        payload.update(
            {"name": "", "email": _mask_email(item.email), "message": ""}
        )
    return payload


def _serialize_suggestion(item, *, full=True):
    payload = {
        "type": "suggestion",
        "id": item.id,
        "publicId": f"SUG-{item.id:06d}",
        "subject": item.country,
        "kind": item.kind,
        "status": item.status,
        "isViewed": bool(item.is_viewed),
        "resolvedAt": serialize_utc(item.resolved_at),
        "createdAt": serialize_utc(item.created_at),
        "redacted": not full,
    }
    if full:
        payload.update(
            {
                "name": item.contact_name,
                "email": item.contact_email,
                "phone": item.contact_phone,
                "message": item.comment,
            }
        )
    else:
        payload.update(
            {
                "name": "",
                "email": _mask_email(item.contact_email),
                "phone": "",
                "message": "",
            }
        )
    return payload


@api_bp.get("/admin/forms")
@require_capability("forms_triage")
def api_admin_forms_list():
    full = has_capability("forms_full")
    form_type = request.args.get("type", "").strip()
    status = request.args.get("status", "").strip()
    search = request.args.get("q", "").strip().casefold()
    items = []
    if form_type in {"", "contact"}:
        query = ContactRequest.query
        if status:
            query = query.filter(ContactRequest.status == status)
        if search:
            pattern = f"%{search}%"
            columns = [func.lower(ContactRequest.subject).like(pattern)]
            if full:
                columns += [func.lower(ContactRequest.name).like(pattern), func.lower(ContactRequest.email).like(pattern)]
            query = query.filter(or_(*columns))
        items.extend(_serialize_contact(item, full=full) for item in query.all())
    if form_type in {"", "suggestion"}:
        query = EventSuggestion.query
        if status:
            query = query.filter(EventSuggestion.status == status)
        if search:
            pattern = f"%{search}%"
            columns = [func.lower(EventSuggestion.country).like(pattern)]
            if full:
                columns += [func.lower(EventSuggestion.contact_name).like(pattern), func.lower(EventSuggestion.contact_email).like(pattern)]
            query = query.filter(or_(*columns))
        items.extend(_serialize_suggestion(item, full=full) for item in query.all())
    items.sort(key=lambda item: item["createdAt"], reverse=True)
    return jsonify({"items": items, "capabilities": {"full": full}})


@api_bp.patch("/admin/forms/<form_type>/<int:item_id>")
@require_capability("forms_triage")
def api_admin_form_update(form_type, item_id):
    full = has_capability("forms_full")
    model = ContactRequest if form_type == "contact" else EventSuggestion if form_type == "suggestion" else None
    if model is None:
        return api_error("not_found", "Form entry not found.", status=404)
    item = db.session.get(model, item_id)
    if item is None:
        return api_error("not_found", "Form entry not found.", status=404)
    body = get_json_body()
    if "isViewed" in body:
        item.is_viewed = bool(body["isViewed"])
    if "status" in body:
        status = (body.get("status") or "").strip()
        if status not in {"new", "in_progress", "resolved", "archived"}:
            return validation_error({"status": "Unknown form status."})
        item.status = status
        item.resolved_at = utc_now() if status in RESOLVED_FORM_STATUSES else None
    db.session.commit()
    serialize = _serialize_contact if form_type == "contact" else _serialize_suggestion
    return jsonify(serialize(item, full=full))
