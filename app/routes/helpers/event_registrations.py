import secrets
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from sqlalchemy import func, or_

from app.models import (
    EVENT_REGISTRATION_CAPACITY_STATUSES,
    EVENT_REGISTRATION_NON_CANCELLED_STATUSES,
    EVENT_REGISTRATION_STATUS_APPROVED,
    EVENT_REGISTRATION_STATUS_CANCELLED,
    EVENT_REGISTRATION_STATUS_LABELS,
    EVENT_REGISTRATION_STATUS_WAITING_LIST,
    EVENT_REGISTRATION_STATUS_WAITING_PAYMENT,
    EVENT_REGISTRATION_STATUS_WAITING_REFUND,
    EventRegistration,
)
from app.routes.helpers.tandem_form import KNOWN_OCCUPATIONS, get_occupation_choices

EVENT_REGISTRATION_DIET_CHOICES = [
    {"value": "omnivore", "label": "Omnivore"},
    {"value": "vegetarian", "label": "Vegetarian"},
    {"value": "vegan", "label": "Vegan"},
]

EVENT_REGISTRATION_STATUS_CHOICES = [
    EVENT_REGISTRATION_STATUS_WAITING_PAYMENT,
    EVENT_REGISTRATION_STATUS_APPROVED,
    EVENT_REGISTRATION_STATUS_WAITING_LIST,
    EVENT_REGISTRATION_STATUS_WAITING_REFUND,
    EVENT_REGISTRATION_STATUS_CANCELLED,
]


def build_event_registration_public_id():
    while True:
        candidate = f"APP-{secrets.token_hex(4).upper()}"
        exists = EventRegistration.query.filter_by(public_id=candidate).first()
        if exists is None:
            return candidate


def parse_price_cents(raw_value):
    value = (raw_value or "").strip()
    if not value:
        return None

    normalized = value.replace(",", ".")
    try:
        amount = Decimal(normalized)
    except InvalidOperation:
        return None

    if amount < 0:
        return None

    cents = (amount * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(cents)


def format_price_cents(value):
    if value is None:
        return ""
    return f"{value / 100:.2f}"


def build_event_registration_form_values(post, item=None):
    values = {
        "first_name": "",
        "last_name": "",
        "email": "",
        "occupation": "",
        "occupation_other": "",
        "diet_preference": "",
        "comment": "",
    }

    if item is None:
        return values

    raw_occupation = item.occupation or ""
    is_known_occupation = raw_occupation in KNOWN_OCCUPATIONS

    values.update(
        {
            "first_name": item.first_name,
            "last_name": item.last_name,
            "email": item.email,
            "occupation": raw_occupation if is_known_occupation else "other",
            "occupation_other": "" if is_known_occupation else raw_occupation,
            "diet_preference": item.diet_preference or "",
            "comment": item.comment or "",
        }
    )
    return values


def resolve_event_registration_occupation(values):
    if values["occupation"] == "other":
        return values["occupation_other"]
    return values["occupation"]


def should_collect_diet_preference(post):
    return post.event_kind == "breakfast"


def determine_initial_registration_status(post):
    return (
        EVENT_REGISTRATION_STATUS_WAITING_PAYMENT
        if post.has_registration_space
        else EVENT_REGISTRATION_STATUS_WAITING_LIST
    )


def promote_waiting_list_for_post(post):
    if not post.has_registration_queue:
        return []

    promoted = []

    while post.has_registration_space:
        candidate = (
            EventRegistration.query
            .filter(EventRegistration.post_id == post.id)
            .filter(EventRegistration.status == EVENT_REGISTRATION_STATUS_WAITING_LIST)
            .order_by(EventRegistration.created_at.asc(), EventRegistration.id.asc())
            .first()
        )
        if candidate is None:
            break

        candidate.status = EVENT_REGISTRATION_STATUS_WAITING_PAYMENT
        promoted.append(candidate)

    return promoted


def get_waiting_list_position(item):
    if item.status != EVENT_REGISTRATION_STATUS_WAITING_LIST:
        return None

    queued_ids = [
        registration_id
        for registration_id, in (
            EventRegistration.query
            .with_entities(EventRegistration.id)
            .filter(EventRegistration.post_id == item.post_id)
            .filter(EventRegistration.status == EVENT_REGISTRATION_STATUS_WAITING_LIST)
            .order_by(EventRegistration.created_at.asc(), EventRegistration.id.asc())
            .all()
        )
    ]

    try:
        return queued_ids.index(item.id) + 1
    except ValueError:
        return None


def build_post_registration_summary(post):
    if not post.has_registration_queue:
        return None

    grouped_counts = dict(
        EventRegistration.query
        .with_entities(EventRegistration.status, func.count(EventRegistration.id))
        .filter(EventRegistration.post_id == post.id)
        .group_by(EventRegistration.status)
        .all()
    )

    non_cancelled_count = sum(
        grouped_counts.get(status, 0)
        for status in EVENT_REGISTRATION_NON_CANCELLED_STATUSES
    )
    reserved_count = sum(
        grouped_counts.get(status, 0)
        for status in EVENT_REGISTRATION_CAPACITY_STATUSES
    )
    waiting_list_count = grouped_counts.get(EVENT_REGISTRATION_STATUS_WAITING_LIST, 0)

    return {
        "non_cancelled_count": non_cancelled_count,
        "reserved_count": reserved_count,
        "waiting_list_count": waiting_list_count,
        "places_total": post.registration_limit or 0,
        "places_remaining": max((post.registration_limit or 0) - reserved_count, 0),
        "price_label": "Deposit" if post.registration_is_deposit else "Price",
        "price_note": (
            "Returned later"
            if post.registration_is_deposit
            else "Ticket / entry price"
        ),
    }


def build_event_registration_status_context(item):
    return {
        "status": item.status,
        "status_label": EVENT_REGISTRATION_STATUS_LABELS.get(item.status, item.status_label),
        "waiting_list_position": get_waiting_list_position(item),
    }


def search_event_registrations(query_text, *, post_id=None):
    query = EventRegistration.query

    if post_id is not None:
        query = query.filter(EventRegistration.post_id == post_id)

    raw_query = (query_text or "").strip()
    if not raw_query:
        return query.order_by(EventRegistration.created_at.asc(), EventRegistration.id.asc())

    like_value = f"%{raw_query.lower()}%"
    full_name_expr = func.lower(EventRegistration.first_name + " " + EventRegistration.last_name)

    return (
        query
        .filter(
            or_(
                func.lower(EventRegistration.public_id).like(like_value),
                func.lower(EventRegistration.first_name).like(like_value),
                func.lower(EventRegistration.last_name).like(like_value),
                full_name_expr.like(like_value),
            )
        )
        .order_by(EventRegistration.created_at.asc(), EventRegistration.id.asc())
    )


def get_event_registration_template_context(post, values, errors=None):
    return {
        "post": post,
        "values": values,
        "errors": errors or {},
        "occupation_choices": get_occupation_choices(),
        "diet_choices": EVENT_REGISTRATION_DIET_CHOICES,
    }
