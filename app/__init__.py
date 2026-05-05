from flask import Flask

from flask import g, url_for
from sqlalchemy import text
from app.site_content import get_footer_offer_links, t

from app.demo_seed import seed_demo_data

from app.models import (
    EVENT_REGISTRATION_STATUS_APPROVED,
    EVENT_REGISTRATION_STATUS_CANCELLED,
    EVENT_REGISTRATION_STATUS_WAITING_LIST,
    EVENT_REGISTRATION_STATUS_WAITING_PAYMENT,
    EVENT_REGISTRATION_STATUS_WAITING_REFUND,
    db,
)
from app.routes.helpers.access import has_any_access, has_any_access_key
from app.routes.helpers.demos import get_debug_nav_links
from config import Config


def event_kind_meta(kind):
    mapping = {
        "karaoke": {"label": "Karaoke", "badge": "text-bg-warning", "color": "warning"},
        "country_evening": {"label": "Country Evening", "badge": "text-bg-danger", "color": "danger"},
        "board_games": {"label": "Board Games", "badge": "text-bg-success", "color": "success"},
        "cafe_lingua": {"label": "Café Lingua", "badge": "text-bg-primary", "color": "primary"},
        "dance": {"label": "Dance Workshops", "badge": "text-bg-info", "color": "info"},
        "breakfast": {"label": "International Breakfast", "badge": "text-bg-secondary", "color": "secondary"},
        "trip": {"label": "International Weekend", "badge": "text-bg-dark", "color": "dark"},
        "housing": {"label": "Housing", "badge": "text-bg-light", "color": "secondary"},
    }
    return mapping.get(kind)


def should_show_event_label(item):
    if getattr(item, "event_kind", None) == "board_games":
        return False

    meta = event_kind_meta(getattr(item, "event_kind", None))
    if meta is None:
        return False

    title = (getattr(item, "display_title", None) or getattr(item, "title", "")).strip().casefold()
    label = meta["label"].strip().casefold()
    if not title or not label:
        return False

    if title == label:
        return False

    if title.startswith(label):
        suffix = title[len(label):]
        if not suffix or suffix[:1] in {":", "-", "·", " ", "("}:
            return False

    return True


def event_registration_status_badge(status):
    mapping = {
        EVENT_REGISTRATION_STATUS_APPROVED: "text-bg-success",
        EVENT_REGISTRATION_STATUS_CANCELLED: "text-bg-dark",
        EVENT_REGISTRATION_STATUS_WAITING_PAYMENT: "text-bg-warning",
        EVENT_REGISTRATION_STATUS_WAITING_LIST: "text-bg-secondary",
        EVENT_REGISTRATION_STATUS_WAITING_REFUND: "text-bg-info",
    }
    return mapping.get(status, "text-bg-secondary")


def create_app():
    app = Flask(
        __name__,
        template_folder="../templates",
        static_folder="../static",
    )
    app.config.from_object(Config)

    db.init_app(app)

    @app.context_processor
    def inject_common_helpers():
        debug_nav_links = get_debug_nav_links() if (app.debug or app.config.get("DEBUG")) else []

        show_admin_nav = has_any_access_key()

        return {
            "event_kind_meta": event_kind_meta,
            "event_registration_status_badge": event_registration_status_badge,
            "should_show_event_label": should_show_event_label,
            "t": lambda key: t(getattr(g, "locale", "en"), key),
            "footer_offer_links": get_footer_offer_links(getattr(g, "locale", "en")),
            "debug_nav_links": debug_nav_links,
            "show_admin_nav": show_admin_nav,
            "admin_nav_url": (
                url_for("main.admin_corridor") if has_any_access() else url_for("main.admin_login")
            ) if show_admin_nav else None,
        }

    with app.app_context():
        db.create_all()
        with db.engine.connect() as conn:
            schema_updates = (
                (
                    "ALTER TABLE language_tandem_requests "
                    "ADD COLUMN offered_language_levels TEXT NOT NULL DEFAULT '{}'"
                ),
                (
                    "ALTER TABLE tandem_match_review_states "
                    "ADD COLUMN contacted_at DATETIME"
                ),
                (
                    "ALTER TABLE tandem_match_review_states "
                    "ADD COLUMN final_pair_at DATETIME"
                ),
                (
                    "ALTER TABLE posts "
                    "ADD COLUMN publish_at DATETIME"
                ),
                (
                    "ALTER TABLE posts "
                    "ADD COLUMN registration_limit_enabled BOOLEAN NOT NULL DEFAULT 0"
                ),
                (
                    "ALTER TABLE posts "
                    "ADD COLUMN registration_limit INTEGER"
                ),
                (
                    "ALTER TABLE posts "
                    "ADD COLUMN registration_price_cents INTEGER"
                ),
                (
                    "ALTER TABLE posts "
                    "ADD COLUMN registration_is_deposit BOOLEAN NOT NULL DEFAULT 0"
                ),
            )

            for statement in schema_updates:
                try:
                    conn.execute(text(statement))
                    conn.commit()
                except Exception:
                    pass
        seed_demo_data()

    from app.routes import bp
    app.register_blueprint(bp)

    return app
