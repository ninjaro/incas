from flask import Flask

from flask import g, redirect, request, url_for
from flask_migrate import Migrate
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

migrate = Migrate(compare_type=True)


def legacy_react_target(path):
    """Map externally bookmarked Jinja URLs to their React equivalents."""
    exact = {
        "/": "/",
        "/posts": "/",
        "/events": "/calendar",
        "/calendar": "/calendar",
        "/contacts": "/contact",
        "/contact-form": "/contact",
        "/suggest-event": "/suggest-event",
        "/language-tandem": "/tandem",
        "/team": "/about?section=team",
        "/about": "/about",
        "/about/working-groups": "/about/working-groups",
        "/about/team-meetings": "/about/team-meetings",
        "/offers": "/offers",
        "/admin": "/admin",
        "/admin/corridor": "/admin",
        "/admin/unlock": "/admin",
        "/admin/scan": "/admin/access-keys",
        "/admin/posts": "/admin/posts",
        "/admin/event-registrations": "/admin/registrations",
        "/admin/forms": "/admin/forms",
        "/admin/access-keys": "/admin/access-keys",
        "/admin/language-tandem": "/admin/tandem",
    }
    if path in exact:
        return exact[path]
    if path.startswith("/landing-"):
        return "/"
    if path.startswith("/calendar-"):
        return "/calendar"
    if path.startswith("/language-tandem-"):
        return "/tandem"
    if path.startswith("/offers/"):
        return path
    if path.startswith("/events/"):
        return path
    if path.startswith("/content/") and not path.endswith("/register"):
        return f"/events/{path.removeprefix('/content/')}"
    if path.startswith("/event-registrations/"):
        return f"/registrations/{path.removeprefix('/event-registrations/')}"
    if path.startswith("/admin/event-registrations/"):
        return "/admin/registrations"
    if path.startswith("/admin/language-tandem/"):
        return "/admin/tandem"
    if path.startswith("/admin/posts/"):
        return "/admin/posts"
    if path.startswith("/admin/access/"):
        return "/admin"
    return None

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


def create_app(config_overrides=None):
    app = Flask(
        __name__,
        template_folder="../templates",
        static_folder="../static",
    )
    app.config.from_object(Config)
    if config_overrides:
        app.config.update(config_overrides)

    db.init_app(app)
    migrate.init_app(app, db)

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
        if app.config["AUTO_CREATE_SCHEMA"]:
            db.create_all()
        if app.config["SEED_DEMO_DATA"]:
            seed_demo_data()

    @app.cli.command("seed-demo")
    def seed_demo_command():
        """Seed synthetic records only in explicit development/demo environments."""
        if app.config["APP_ENV"] not in {"development", "demo", "test"}:
            raise RuntimeError("Refusing to seed outside development, demo, or test.")
        seed_demo_data()

    from app.routes import bp
    app.register_blueprint(bp)

    from app.api import api_bp
    app.register_blueprint(api_bp)

    register_spa_routes(app)

    @app.before_request
    def route_primary_frontend():
        if not app.config["REACT_PRIMARY_FRONTEND"] or request.method != "GET":
            return None
        target = legacy_react_target(request.path)
        if target is None or request.path.startswith(("/api/", "/static/", "/app")):
            return None
        query = request.query_string.decode("utf-8")
        separator = "&" if "?" in target else "?"
        if query:
            target = f"{target}{separator}{query}"
        return redirect(f"/app/#{target}", code=302)

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
