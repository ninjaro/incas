from datetime import datetime

from flask import jsonify, request

from app.api import api_bp
from app.models import PageThemeSelection, Post
from app.site_content import SITE_UI, get_footer_offer_links, get_site_offers, t
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
            ],
        },
        {"label": t(locale, "nav.forms"), "to": "/offers"},
        {"label": t(locale, "nav.language_tandem"), "to": "/tandem"},
        {"label": t(locale, "nav.karaoke"), "to": "/karaoke"},
        {"label": t(locale, "nav.contacts"), "to": "/contact"},
        {"label": t(locale, "nav.team"), "to": "/team"},
    ]


def _serialize_offers(locale):
    offers = get_site_offers(locale)
    return {
        "title": offers["title"],
        "subtitle": offers["subtitle"],
        "pages": [
            {"title": p["title"], "to": _app_route(p["url"]), "icon": p["icon"]}
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
