from flask import Flask

from flask import g
from sqlalchemy import text
from app.site_content import get_footer_offer_links, t

from app.demo_seed import seed_demo_data
from app.models import db
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
        return {
            "event_kind_meta": event_kind_meta,
            "should_show_event_label": should_show_event_label,
            "t": lambda key: t(getattr(g, "locale", "en"), key),
            "footer_offer_links": get_footer_offer_links(getattr(g, "locale", "en")),
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
