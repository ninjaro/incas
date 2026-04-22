from flask import Flask

from flask import g
from app.site_content import t

from app.demo_seed import seed_demo_data
from app.models import db
from config import Config


def event_kind_meta(kind):
    mapping = {
        "karaoke": {"label": "Karaoke", "badge": "text-bg-warning"},
        "country_evening": {"label": "Country Evening", "badge": "text-bg-danger"},
        "board_games": {"label": "Board Games", "badge": "text-bg-success"},
        "cafe_lingua": {"label": "Café Lingua", "badge": "text-bg-primary"},
        "dance": {"label": "Dance", "badge": "text-bg-info"},
        "breakfast": {"label": "Breakfast", "badge": "text-bg-secondary"},
        "trip": {"label": "Trip", "badge": "text-bg-dark"},
        "housing": {"label": "Housing", "badge": "text-bg-light"},
    }
    return mapping.get(kind)


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
            "t": lambda key: t(getattr(g, "locale", "en"), key),
        }

    with app.app_context():
        db.create_all()
        seed_demo_data()

    from app.routes import bp
    app.register_blueprint(bp)

    return app
