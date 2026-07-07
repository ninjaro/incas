from datetime import datetime

from flask import jsonify, request

from app.api import api_bp
from app.models import PageThemeSelection, Post
from app.social import process_due_social_publications
from app.themes_registry import THEME_PAGES, resolve_public_theme


def serialize_public_post(item):
    title_parts = item.display_title_parts
    return {
        "slug": item.slug,
        "title": {
            "full": title_parts.get("full", item.display_title),
            "prefix": title_parts.get("prefix", ""),
            "focus": title_parts.get("focus", ""),
        },
        "summary": item.summary,
        "eventKind": item.event_kind,
        "isEvent": item.is_event,
        "isPinned": bool(item.is_pinned),
        "isLive": item.is_live,
        "startsAt": item.starts_at.isoformat() if item.starts_at else None,
        "imageUrl": item.image_url,
        "registration": {
            "hasQueue": item.has_registration_queue,
            "priceCents": item.registration_price_cents,
            "isDeposit": bool(item.registration_is_deposit),
            "placesRemaining": item.registration_places_remaining,
        }
        if item.has_registration_queue
        else None,
    }


def get_public_items():
    return [
        item
        for item in Post.query.filter(Post.is_active.is_(True)).order_by(Post.created_at.desc()).all()
        if item.is_publicly_accessible
    ]


@api_bp.get("/public/config")
def api_public_config():
    process_due_social_publications()
    selections = {row.page_id: row.theme_id for row in PageThemeSelection.query.all()}
    return jsonify(
        {
            "themes": {
                page_id: resolve_public_theme(page_id, selections.get(page_id))
                for page_id in THEME_PAGES
            },
        }
    )


@api_bp.get("/public/posts")
def api_public_posts():
    items = get_public_items()
    kind = request.args.get("kind", "").strip()
    if kind:
        items = [item for item in items if item.event_kind == kind]

    live_events = sorted(
        (item for item in items if item.is_event and item.is_live),
        key=lambda item: item.starts_at,
    )
    live_posts = [item for item in items if not item.is_event and item.is_live]

    return jsonify(
        {
            "events": [serialize_public_post(item) for item in live_events],
            "posts": [serialize_public_post(item) for item in live_posts],
        }
    )


@api_bp.get("/public/posts/<slug>")
def api_public_post_detail(slug):
    item = Post.query.filter_by(slug=slug).first()
    if item is None or not item.is_publicly_accessible:
        return jsonify({"error": {"code": "not_found", "message": "Post not found."}}), 404
    payload = serialize_public_post(item)
    payload["body"] = item.body
    return jsonify(payload)


@api_bp.get("/public/calendar")
def api_public_calendar():
    now = datetime.utcnow()
    try:
        year = int(request.args.get("year", now.year))
        month = int(request.args.get("month", now.month))
    except (TypeError, ValueError):
        year, month = now.year, now.month

    if not (1 <= month <= 12):
        year, month = now.year, now.month

    events = [
        serialize_public_post(item)
        for item in get_public_items()
        if item.is_event
        and item.starts_at.year == year
        and item.starts_at.month == month
    ]
    events.sort(key=lambda payload: payload["startsAt"])
    return jsonify({"year": year, "month": month, "events": events})
