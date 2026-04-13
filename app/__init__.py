from flask import Flask
from config import Config
from app.models import db
from app.demo_seed import seed_demo_data

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    with app.app_context():
        db.create_all()
        seed_demo_data()

    from app.routes import bp
    app.register_blueprint(bp)

    return app
