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
from config import Config
from app.event_kinds import get_event_kind

# Transitional Bootstrap display values for the legacy Jinja UI. badge/color
# are not a clean function of the registry `marker` (housing is text-bg-light
# but color secondary), so they are kept here, in the one legacy consumer, and
# deleted when the Jinja UI is removed (Phase D). The canonical registry stays
# clean with only `marker`.
_LEGACY_BADGE = {
    "karaoke": ("text-bg-warning", "warning"),
    "country_evening": ("text-bg-danger", "danger"),
    "board_games": ("text-bg-success", "success"),
    "cafe_lingua": ("text-bg-primary", "primary"),
    "dance": ("text-bg-info", "info"),
    "breakfast": ("text-bg-secondary", "secondary"),
    "trip": ("text-bg-dark", "dark"),
    "housing": ("text-bg-light", "secondary"),
}


def event_kind_meta(kind):
    ek = get_event_kind(kind)
    badge_color = _LEGACY_BADGE.get(kind)
    if ek is None or badge_color is None:
        return None
    badge, color = badge_color
    return {"label": ek["label"]["en"], "badge": badge, "color": color}


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
        show_admin_nav = has_any_access_key()

        return {
            "event_kind_meta": event_kind_meta,
            "event_registration_status_badge": event_registration_status_badge,
            "should_show_event_label": should_show_event_label,
            "t": lambda key: t(getattr(g, "locale", "en"), key),
            "footer_offer_links": get_footer_offer_links(getattr(g, "locale", "en")),
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
                (
                    "ALTER TABLE posts "
                    "ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'published'"
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

    from app.api import api_bp
    app.register_blueprint(api_bp)

    register_spa_routes(app)

    return app


def register_spa_routes(app):
    """Serve the compiled React application from static/app when it exists.

    The SPA uses hash-based routing, so a single entry HTML is enough and no
    server-side rewrites are needed.
    """
    import os

    from flask import send_from_directory

    spa_dir = os.path.join(app.static_folder, "app")

    @app.route("/app/")
    @app.route("/app")
    def spa_index():
        index_path = os.path.join(spa_dir, "index.html")
        if not os.path.exists(index_path):
            return (
                "The frontend bundle has not been built yet. Run: npm run build",
                503,
            )
        return send_from_directory(spa_dir, "index.html")
