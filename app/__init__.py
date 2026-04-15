from flask import Flask

from app.demo_seed import seed_demo_data
from app.models import db
from config import Config


def create_app():
    app = Flask(
        __name__,
        template_folder="../templates",
        static_folder="../static",
    )
    app.config.from_object(Config)

    db.init_app(app)

    with app.app_context():
        db.create_all()
        seed_demo_data()

    from app.routes import bp
    app.register_blueprint(bp)

    return app
