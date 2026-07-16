import re
from collections import defaultdict

from flask import current_app, jsonify, request
from sqlalchemy import func

from app.api import api_bp, api_error
from app.datetime_utils import local_now, serialize_utc, utc_to_local
from app.event_kinds import EVENT_KIND_SCHEMA_VERSION, EVENT_KINDS
from app.models import (
    EVENT_REGISTRATION_CAPACITY_STATUSES,
    EVENT_REGISTRATION_NON_CANCELLED_STATUSES,
    EVENT_REGISTRATION_STATUS_APPROVED,
    EVENT_REGISTRATION_STATUS_WAITING_LIST,
    EventRegistration,
    PageThemeSelection,
    Post,
    PostSlugRedirect,
    SocialPublication,
    db,
)
from app.payments import get_payment_provider
from app.routes.helpers.event_registrations import expire_waiting_payment_registrations
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


def _serialize_social_links(item, publications=None):
    links = []
    if item.instagram_permalink:
        links.append(
            {
                "provider": "instagram",
                "url": item.instagram_permalink,
                "isSimulated": False,
            }
        )
    if publications is None and item.id is not None:
        publications = SocialPublication.query.filter_by(
            post_id=item.id,
            status="published",
        ).all()
    for publication in publications or ():
        if publication.permalink and not any(link["url"] == publication.permalink for link in links):
            links.append(
                {
                    "provider": publication.provider,
                    "url": publication.permalink,
                    "isSimulated": bool(publication.is_simulated),
                }
            )
    return links


def _serialize_registration(item, status_counts=None):
    if not item.has_registration_queue:
        return None

    counts = status_counts or {}
    if status_counts is None and item.id is not None:
        counts = dict(
            db.session.query(EventRegistration.status, func.count(EventRegistration.id))
            .filter(EventRegistration.post_id == item.id)
            .group_by(EventRegistration.status)
            .all()
        )
    confirmed_count = counts.get(EVENT_REGISTRATION_STATUS_APPROVED, 0)
    reserved_count = sum(counts.get(status, 0) for status in EVENT_REGISTRATION_CAPACITY_STATUSES)
    waiting_count = counts.get(EVENT_REGISTRATION_STATUS_WAITING_LIST, 0)
    non_cancelled_count = sum(
        counts.get(status, 0) for status in EVENT_REGISTRATION_NON_CANCELLED_STATUSES
    )
    places_remaining = max((item.registration_limit or 0) - reserved_count, 0)

    if not item.is_live:
        availability = "closed"
    elif places_remaining > 0:
        availability = "available"
    else:
        availability = "waiting_list"

    return {
        "hasQueue": True,
        "availability": availability,
        "capacity": item.registration_limit or 0,
        "confirmedCount": confirmed_count,
        "reservedCount": reserved_count,
        "waitingListCount": waiting_count,
        "nonCancelledCount": non_cancelled_count,
        "placesRemaining": places_remaining,
        "mode": item.effective_registration_mode,
        "priceCents": item.registration_price_cents,
        "currency": "EUR",
        "isDeposit": bool(item.registration_is_deposit),
        "depositExplanation": item.deposit_explanation
        or ("This refundable deposit is returned after participation." if item.registration_is_deposit else ""),
    }


def build_public_serialization_context(items):
    post_ids = [item.id for item in items if item.id is not None]
    publications_by_post = defaultdict(list)
    counts_by_post = defaultdict(dict)
    if post_ids:
        publications = (
            SocialPublication.query
            .filter(SocialPublication.post_id.in_(post_ids))
            .filter(SocialPublication.status == "published")
            .all()
        )
        for publication in publications:
            publications_by_post[publication.post_id].append(publication)
        count_rows = (
            db.session.query(
                EventRegistration.post_id,
                EventRegistration.status,
                func.count(EventRegistration.id),
            )
            .filter(EventRegistration.post_id.in_(post_ids))
            .group_by(EventRegistration.post_id, EventRegistration.status)
            .all()
        )
        for post_id, status, count in count_rows:
            counts_by_post[post_id][status] = count
    return {
        "publications": publications_by_post,
        "registrationCounts": counts_by_post,
    }


def serialize_public_post(item, *, include_body=False, context=None):
    context = context or {}
    publications_by_post = context.get("publications")
    registration_counts_by_post = context.get("registrationCounts")
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
        "startsAt": serialize_utc(item.starts_at),
        "endsAt": serialize_utc(item.ends_at),
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
        "socialLinks": _serialize_social_links(
            item,
            (
                publications_by_post.get(item.id, [])
                if publications_by_post is not None
                else None
            ),
        ),
        "features": item.effective_features,
        "map": _serialize_map(item),
        "registration": _serialize_registration(
            item,
            (
                registration_counts_by_post.get(item.id, {})
                if registration_counts_by_post is not None
                else None
            ),
        ),
    }
    if include_body:
        payload["bodyHtml"] = sanitize_rich_html(item.body)
    return payload


def get_public_items():
    expired, _promoted = expire_waiting_payment_registrations()
    if expired:
        db.session.commit()
    return [
        item
        for item in Post.query.filter(Post.is_active.is_(True)).order_by(Post.created_at.desc()).all()
        if item.is_publicly_accessible
    ]


@api_bp.get("/public/config")
def api_public_config():
    selections = {row.page_id: row.theme_id for row in PageThemeSelection.query.all()}
    payment_provider = get_payment_provider()
    social_mode = current_app.config.get("SOCIAL_PROVIDER_MODE", "mock")
    return jsonify(
        {
            "themes": {
                page_id: resolve_public_theme(page_id, selections.get(page_id))
                for page_id in THEME_PAGES
            },
            "integrations": {
                "payment": {
                    "provider": payment_provider.name,
                    "isSimulated": payment_provider.name == "mock",
                },
                "social": {
                    "mode": social_mode,
                    "isSimulated": social_mode == "mock",
                },
            },
        }
    )


@api_bp.get("/public/posts")
def api_public_posts():
    items = get_public_items()
    kind = request.args.get("kind", "").strip()
    if kind:
        items = [item for item in items if item.event_kind == kind]
    context = build_public_serialization_context(items)

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
            "events": [serialize_public_post(item, context=context) for item in live_events],
            "posts": [serialize_public_post(item, context=context) for item in live_posts],
            "archivedEvents": [serialize_public_post(item, context=context) for item in archived_events],
        }
    )


@api_bp.get("/public/posts/<slug>")
def api_public_post_detail(slug):
    item = Post.query.filter_by(slug=slug).first()
    redirected_from = None
    if item is None:
        redirect = PostSlugRedirect.query.filter_by(old_slug=slug).first()
        if redirect is not None:
            item = db.session.get(Post, redirect.post_id)
            redirected_from = slug
    if item is None or not item.is_publicly_accessible:
        return jsonify({"error": {"code": "not_found", "message": "Post not found."}}), 404
    context = build_public_serialization_context([item])
    payload = serialize_public_post(item, include_body=True, context=context)
    if redirected_from:
        payload["redirectedFrom"] = redirected_from
    return jsonify(payload)


@api_bp.get("/public/event-kinds")
def api_public_event_kinds():
    return jsonify({"schemaVersion": EVENT_KIND_SCHEMA_VERSION, "items": EVENT_KINDS})


@api_bp.get("/public/calendar")
def api_public_calendar():
    now = local_now()
    try:
        year = int(request.args.get("year", now.year))
        month = int(request.args.get("month", now.month))
    except (TypeError, ValueError):
        year, month = now.year, now.month

    if not (1 <= month <= 12):
        year, month = now.year, now.month

    items = [
        item
        for item in get_public_items()
        if item.is_event
        and utc_to_local(item.starts_at).year == year
        and utc_to_local(item.starts_at).month == month
    ]
    context = build_public_serialization_context(items)
    events = [serialize_public_post(item, context=context) for item in items]
    events.sort(key=lambda payload: payload["startsAt"])
    return jsonify({"year": year, "month": month, "events": events})


# Kept in sync with app/routes/public.py; defined locally to avoid a
# circular import between the API and legacy route modules.
SUPPORTED_LOCALES = {"en", "de"}
DEFAULT_LOCALE = "en"

# Legacy Flask path -> canonical React BrowserRouter path.
_LEGACY_TO_APP = {
    "/language-tandem": "/tandem",
    "/contact-form": "/contact?form=general",
    "/contacts": "/contact",
}


def _app_route(url):
    if not url:
        return url
    path, _, query = url.partition("?")
    path = _LEGACY_TO_APP.get(path, path)
    if not query:
        return path
    separator = "&" if "?" in path else "?"
    return f"{path}{separator}{query}"


def _coerce_locale(raw):
    return raw if raw in SUPPORTED_LOCALES else DEFAULT_LOCALE


def _serialize_nav(locale):
    return [
        {"label": t(locale, "nav.home"), "to": "/"},
        {"label": t(locale, "nav.calendar"), "to": "/calendar"},
        {
            "label": t(locale, "nav.about"),
            "to": "/about",
            "section": "about",
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
                "eventKind": p.get("event_kind"),
                "featured": bool(p.get("featured")),
                "secondaryAction": (
                    {
                        "title": p["secondary_action"]["title"],
                        "to": _app_route(p["secondary_action"]["url"]),
                    }
                    if p.get("secondary_action")
                    else None
                ),
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


def _normalize_authored_html(body_html):
    """Convert legacy Bootstrap accordions into honest expanded content."""
    body_html = re.sub(
        r'<button class="accordion-button(?: collapsed)?"[^>]*>(.*?)</button>',
        r'<span class="accordion-question">\1</span>',
        body_html,
        flags=re.DOTALL,
    )
    body_html = re.sub(
        r' class="accordion-collapse collapse(?: show)?"(?: data-bs-parent="[^"]+")?',
        ' class="accordion-answer"',
        body_html,
    )
    return body_html


def serialize_content(slug, locale, section=None):
    key = _content_key(slug)
    if key not in SITE_PAGES["en"]:
        return None
    page = get_site_page(key, _coerce_locale(locale))
    if section and page.get("section") != section:
        return None
    return {
        "slug": slug,
        "title": page["title"],
        "section": page["section"],
        "image": page.get("image"),
        "imageAlt": page.get("image_alt", ""),
        "imageWidth": page.get("image_width"),
        "imageHeight": page.get("image_height"),
        "imageAspectRatio": page.get("image_aspect_ratio"),
        "imageObjectPosition": page.get("image_object_position"),
        "imagePriority": page.get("image_priority", False),
        "bodyHtml": _normalize_authored_html(page["body_html"]),
        "form": page.get("form"),
    }


@api_bp.get("/public/content/<slug>")
def api_public_content(slug):
    section = request.args.get("section")
    if section not in {None, "about", "offers"}:
        return api_error("not_found", "Page not found.", status=404)
    payload = serialize_content(
        slug,
        request.args.get("locale", DEFAULT_LOCALE),
        section=section,
    )
    if payload is None:
        return api_error("not_found", "Page not found.", status=404)
    return jsonify(payload)
