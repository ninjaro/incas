from flask import Flask

from flask import Response, g, redirect, request, url_for
from flask_migrate import Migrate
from werkzeug.middleware.proxy_fix import ProxyFix
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


def validate_runtime_config(app):
    if app.config["APP_ENV"] != "production":
        return
    secret = app.config.get("SECRET_KEY") or ""
    if len(secret) < 32 or secret in {"dev-secret", "dev-docker-secret", "change-me"}:
        raise RuntimeError("Production requires an explicit SECRET_KEY of at least 32 characters.")
    database_uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
    if not database_uri.startswith(("postgresql://", "postgresql+")):
        raise RuntimeError("Production requires PostgreSQL for queue and rate-limit locking.")
    if app.config.get("AUTO_CREATE_SCHEMA") or app.config.get("SEED_DEMO_DATA"):
        raise RuntimeError("AUTO_CREATE_SCHEMA and SEED_DEMO_DATA must be disabled in production.")
    if not app.config.get("SESSION_COOKIE_SECURE"):
        raise RuntimeError("Production requires SESSION_COOKIE_SECURE=true.")
    development_root_hash = "9e27c273f5901114167b759edaeb402f290980fe723d1b05f8afc82f0c874d8e"
    if app.config.get("ACCESS_HASHES", {}).get("access_keys") == development_root_hash:
        raise RuntimeError("Production requires an explicit ACCESS_KEYS_ROOT_HASH.")


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


def is_canonical_react_path(path):
    exact = {
        "/", "/calendar", "/tandem", "/about", "/about/team",
        "/about/working-groups", "/about/team-meetings", "/offers",
        "/contact", "/suggest-event", "/admin",
    }
    return path in exact or path.startswith(
        ("/events/", "/offers/", "/registrations/", "/admin/")
    )


def _replace_meta(html_text, *, title, description, image_url, canonical_url, noindex=False):
    import html
    import re

    title = html.escape(title, quote=True)
    description = html.escape(description, quote=True)
    image_url = html.escape(image_url, quote=True)
    canonical_url = html.escape(canonical_url, quote=True)
    html_text = re.sub(
        r"<title>.*?</title>", lambda _match: f"<title>{title}</title>", html_text, count=1
    )
    html_text = re.sub(
        r'<meta name="description" content="[^"]*"\s*/?>',
        lambda _match: f'<meta name="description" content="{description}" />',
        html_text,
        count=1,
    )
    for property_name, content in (
        ("og:title", title),
        ("og:description", description),
        ("og:image", image_url),
        ("og:url", canonical_url),
    ):
        pattern = rf'<meta property="{re.escape(property_name)}" content="[^"]*"\s*/?>'
        replacement = f'<meta property="{property_name}" content="{content}" />'
        if re.search(pattern, html_text):
            html_text = re.sub(pattern, lambda _match: replacement, html_text, count=1)
        else:
            html_text = html_text.replace("</head>", f"    {replacement}\n  </head>", 1)
    canonical = f'<link rel="canonical" href="{canonical_url}" />'
    canonical_pattern = r'<link rel="canonical" href="[^"]*"\s*/?>'
    if re.search(canonical_pattern, html_text):
        html_text = re.sub(
            canonical_pattern,
            lambda _match: canonical,
            html_text,
            count=1,
        )
    else:
        html_text = html_text.replace("</head>", f"    {canonical}\n  </head>", 1)
    if noindex:
        html_text = html_text.replace(
            "</head>", '    <meta name="robots" content="noindex,nofollow" />\n  </head>', 1
        )
    return html_text

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
    validate_runtime_config(app)
    if app.config["TRUST_PROXY_HEADERS"]:
        trusted = max(1, int(app.config["TRUSTED_PROXY_COUNT"]))
        app.wsgi_app = ProxyFix(
            app.wsgi_app,
            x_for=trusted,
            x_proto=trusted,
            x_host=trusted,
        )

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

    import time
    import click

    @app.cli.command("social-worker")
    @click.option("--once", is_flag=True, help="Process due jobs once and exit.")
    @click.option("--interval", default=30, type=click.IntRange(min=5), show_default=True)
    def social_worker_command(once, interval):
        """Process scheduled social publications independently of web traffic."""
        from app.social import process_due_social_publications

        while True:
            processed = process_due_social_publications()
            click.echo(f"processed={len(processed)}")
            db.session.remove()
            if once:
                return
            time.sleep(interval)

    from app.routes import bp
    app.register_blueprint(bp)

    from app.api import api_bp
    app.register_blueprint(api_bp)

    register_spa_routes(app)

    @app.after_request
    def add_security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        response.headers.setdefault(
            "Content-Security-Policy",
            "; ".join(
                (
                    "default-src 'self'",
                    "script-src 'self'",
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                    "font-src 'self' https://fonts.gstatic.com data:",
                    "img-src 'self' data: blob: https://tile.openstreetmap.org https://cdn.simulated.social",
                    "connect-src 'self'",
                    "object-src 'none'",
                    "base-uri 'self'",
                    "frame-ancestors 'self'",
                )
            ),
        )
        return response

    @app.before_request
    def route_primary_frontend():
        if not app.config["REACT_PRIMARY_FRONTEND"] or request.method != "GET":
            return None
        if request.path.startswith(("/api/", "/static/", "/app")):
            return None
        if is_canonical_react_path(request.path):
            return app.extensions["incas_spa_response"]()
        target = legacy_react_target(request.path)
        if target is None:
            return None
        query = request.query_string.decode("utf-8")
        separator = "&" if "?" in target else "?"
        if query:
            target = f"{target}{separator}{query}"
        return redirect(target, code=308)

    return app


def register_spa_routes(app):
    """Serve the compiled BrowserRouter application on canonical public URLs."""
    import os
    from pathlib import Path

    spa_dir = os.path.join(app.static_folder, "app")

    def build_spa_response():
        index_path = Path(app.config.get("SPA_INDEX_PATH") or os.path.join(spa_dir, "index.html"))
        if not index_path.exists():
            return Response("The frontend bundle has not been built yet. Run: npm run build", status=503)

        path = request.path
        title = "INCAS | Intercultural Centre of Aachen Students"
        description = "Events, offers, and intercultural community for students in Aachen."
        image_url = f"{request.url_root.rstrip('/')}/static/img/incas-og.svg"
        page_titles = {
            "/calendar": "Event calendar | INCAS",
            "/offers": "Offers | INCAS",
            "/about": "About us | INCAS",
            "/contact": "Contact | INCAS",
            "/suggest-event": "Suggest an event | INCAS",
            "/tandem": "Language Tandem | INCAS",
        }
        title = page_titles.get(path, title)
        if path.startswith("/events/"):
            from app.models import Post

            item = Post.query.filter_by(slug=path.removeprefix("/events/")).first()
            if item is not None and item.is_publicly_accessible:
                title = f"{item.display_title} | INCAS"
                description = item.summary or description
                if item.image_url:
                    image_url = (
                        item.image_url
                        if item.image_url.startswith(("http://", "https://"))
                        else f"{request.url_root.rstrip('/')}/{item.image_url.lstrip('/')}"
                    )
        canonical_url = f"{request.url_root.rstrip('/')}{path}"
        rendered = _replace_meta(
            index_path.read_text(encoding="utf-8"),
            title=title,
            description=description,
            image_url=image_url,
            canonical_url=canonical_url,
            noindex=path.startswith(("/admin", "/registrations/")),
        )
        return Response(rendered, mimetype="text/html")

    app.extensions["incas_spa_response"] = build_spa_response

    @app.route("/app/")
    @app.route("/app")
    def spa_index():
        return redirect("/", code=308)
