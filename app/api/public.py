from datetime import datetime

from flask import jsonify, request

from app.api import api_bp, api_error
from app.event_kinds import EVENT_KIND_SCHEMA_VERSION, EVENT_KINDS
from app.models import (
    EVENT_REGISTRATION_STATUS_APPROVED,
    PageThemeSelection,
    Post,
    SocialPublication,
)
from app.routes.helpers.event_post_maps import build_event_post_map_context
from app.sanitize import sanitize_rich_html
from app.site_content import (
    SITE_PAGES,
    SITE_UI,
    get_footer_offer_links,
    get_site_offers,
    get_site_page,
    t,
)
from app.social import process_due_social_publications
from app.themes_registry import THEME_PAGES, resolve_public_theme


def _serialize_map(item):
    configured = item.map_config_dict
    source = configured or build_event_post_map_context(item)
    if not source:
        return None
    if configured:
        return configured

    target = source.get("target") or {}
    return {
        "providerId": source.get("provider_id"),
        "providerName": source.get("provider_name"),
        "title": source.get("title"),
        "description": source.get("description"),
        "note": source.get("note"),
        "target": {
            "kind": target.get("kind"),
            "label": target.get("label") or target.get("country_name"),
            "countryCodes": target.get("country_codes", []),
            "center": target.get("center"),
            "zoom": target.get("zoom"),
            "marker": target.get("marker"),
            "origin": target.get("origin"),
            "destination": target.get("destination"),
        },
    }


def _serialize_social_links(item):
    links = []
    if item.instagram_permalink:
        links.append({"provider": "instagram", "url": item.instagram_permalink})
    if item.id is not None:
        publications = SocialPublication.query.filter_by(post_id=item.id, status="published").all()
        for publication in publications:
            if publication.permalink and not any(link["url"] == publication.permalink for link in links):
                links.append({"provider": publication.provider, "url": publication.permalink})
    return links


def _serialize_registration(item):
    if not item.has_registration_queue:
        return None

    confirmed_count = item.registration_reserved_count
    if item.id is not None:
        from app.models import EventRegistration

        confirmed_count = EventRegistration.query.filter_by(
            post_id=item.id,
            status=EVENT_REGISTRATION_STATUS_APPROVED,
        ).count()

    if not item.is_live:
        availability = "closed"
    elif item.registration_places_remaining > 0:
        availability = "available"
    else:
        availability = "waiting_list"

    return {
        "hasQueue": True,
        "availability": availability,
        "capacity": item.registration_limit or 0,
        "confirmedCount": confirmed_count,
        "reservedCount": item.registration_reserved_count,
        "waitingListCount": item.registration_waiting_list_count,
        "nonCancelledCount": item.registration_non_cancelled_count,
        "placesRemaining": item.registration_places_remaining,
        "mode": item.effective_registration_mode,
        "priceCents": item.registration_price_cents,
        "currency": "EUR",
        "isDeposit": bool(item.registration_is_deposit),
        "depositExplanation": item.deposit_explanation
        or ("This refundable deposit is returned after participation." if item.registration_is_deposit else ""),
    }


def serialize_public_post(item, *, include_body=False):
    title_parts = item.display_title_parts
    payload = {
        "slug": item.slug,
        "title": {
            "full": title_parts.get("full", item.display_title),
            "prefix": title_parts.get("prefix", ""),
            "focus": title_parts.get("focus", ""),
        },
        "summary": item.summary,
        "eventKind": item.event_kind,
        "eventKindMeta": item.event_kind_config or None,
        "isEvent": item.is_event,
        "isPinned": bool(item.is_pinned),
        "isLive": item.is_live,
        "publicationState": item.publication_state,
        "startsAt": item.starts_at.isoformat() if item.starts_at else None,
        "endsAt": item.ends_at.isoformat() if item.ends_at else None,
        "durationMinutes": item.duration_minutes,
        "imageUrl": item.image_url,
        "eventPublicId": item.event_public_id if item.is_event else None,
        "venue": item.venue,
        "address": item.address,
        "city": item.city,
        "meetingPoint": item.meeting_point,
        "destination": item.destination,
        "coordinates": (
            {"latitude": item.latitude, "longitude": item.longitude}
            if item.latitude is not None and item.longitude is not None
            else None
        ),
        "destinationCoordinates": (
            {
                "latitude": item.destination_latitude,
                "longitude": item.destination_longitude,
            }
            if item.destination_latitude is not None and item.destination_longitude is not None
            else None
        ),
        "countryCode": item.country_code or None,
        "socialLinks": _serialize_social_links(item),
        "features": item.effective_features,
        "map": _serialize_map(item),
        "registration": _serialize_registration(item),
    }
    if include_body:
        payload["bodyHtml"] = sanitize_rich_html(item.body)
    return payload


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
    archived_events = sorted(
        (item for item in items if item.is_event and not item.is_live),
        key=lambda item: item.starts_at,
        reverse=True,
    )

    return jsonify(
        {
            "events": [serialize_public_post(item) for item in live_events],
            "posts": [serialize_public_post(item) for item in live_posts],
            "archivedEvents": [serialize_public_post(item) for item in archived_events],
        }
    )


@api_bp.get("/public/posts/<slug>")
def api_public_post_detail(slug):
    item = Post.query.filter_by(slug=slug).first()
    if item is None or not item.is_publicly_accessible:
        return jsonify({"error": {"code": "not_found", "message": "Post not found."}}), 404
    payload = serialize_public_post(item, include_body=True)
    return jsonify(payload)


@api_bp.get("/public/event-kinds")
def api_public_event_kinds():
    return jsonify({"schemaVersion": EVENT_KIND_SCHEMA_VERSION, "items": EVENT_KINDS})


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


# Kept in sync with app/routes/public.py; defined locally to avoid a
# circular import between the API and legacy route modules.
SUPPORTED_LOCALES = {"en", "de"}
DEFAULT_LOCALE = "en"

# Legacy Flask path -> React (HashRouter) route. Values are react-router
# "to" paths (no leading "#"); query strings are preserved.
_LEGACY_TO_APP = {
    "/language-tandem": "/tandem",
    "/contact-form": "/contact",
    "/contacts": "/contact",
}


def _app_route(url):
    if not url:
        return url
    path, _, query = url.partition("?")
    path = _LEGACY_TO_APP.get(path, path)
    return f"{path}?{query}" if query else path


def _coerce_locale(raw):
    return raw if raw in SUPPORTED_LOCALES else DEFAULT_LOCALE


def _serialize_nav(locale):
    return [
        {"label": t(locale, "nav.home"), "to": "/"},
        {"label": t(locale, "nav.calendar"), "to": "/calendar"},
        {
            "label": t(locale, "nav.about"),
            "to": None,
            "children": [
                {"label": t(locale, "nav.about_us"), "to": "/about"},
                {"label": t(locale, "nav.working_groups"), "to": "/about/working-groups"},
                {"label": t(locale, "nav.team_meetings"), "to": "/about/team-meetings"},
                {"label": t(locale, "nav.team"), "to": "/about/team"},
            ],
        },
        {"label": t(locale, "nav.forms"), "to": "/offers"},
        {"label": t(locale, "nav.language_tandem"), "to": "/tandem"},
        {"label": t(locale, "nav.contacts"), "to": "/contact"},
    ]


def _serialize_offers(locale):
    offers = get_site_offers(locale)
    return {
        "title": offers["title"],
        "subtitle": offers["subtitle"],
        "pages": [
            {
                "title": p["title"],
                "to": _app_route(p["url"]),
                "icon": p["icon"],
                "description": p.get("description", ""),
            }
            for p in offers["pages"]
        ],
        "forms": [
            {"title": f["title"], "to": _app_route(f["url"])} for f in offers["forms"]
        ],
    }


def _serialize_footer(locale):
    return {
        "copy": "INCAS — Intercultural Centre of Aachen Students",
        "social": [
            {"platform": "facebook", "url": "https://www.facebook.com/INCASAachen/"},
            {"platform": "instagram", "url": "https://www.instagram.com/incas_aachen/"},
            {"platform": "youtube", "url": None},
            {"platform": "linkedin", "url": None},
        ],
        "offerLinks": [
            {"title": link["title"], "to": _app_route(link["url"])}
            for link in get_footer_offer_links(locale)
        ],
    }


def serialize_site(locale):
    locale = _coerce_locale(locale)
    return {
        "locale": locale,
        "strings": SITE_UI.get(locale, SITE_UI["en"]),
        "nav": _serialize_nav(locale),
        "offers": _serialize_offers(locale),
        "footer": _serialize_footer(locale),
    }


@api_bp.get("/public/site")
def api_public_site():
    return jsonify(serialize_site(request.args.get("locale", DEFAULT_LOCALE)))


def _content_key(slug):
    return slug.replace("-", "_")


def serialize_content(slug, locale):
    key = _content_key(slug)
    if key not in SITE_PAGES["en"]:
        return None
    page = get_site_page(key, _coerce_locale(locale))
    return {
        "slug": slug,
        "title": page["title"],
        "image": page.get("image"),
        "bodyHtml": page["body_html"],
        "form": page.get("form"),
    }


@api_bp.get("/public/content/<slug>")
def api_public_content(slug):
    payload = serialize_content(slug, request.args.get("locale", DEFAULT_LOCALE))
    if payload is None:
        return api_error("not_found", "Page not found.", status=404)
    return jsonify(payload)
