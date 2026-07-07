import os
import sys
from datetime import timedelta

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ["DATABASE_URL"] = "sqlite://"

from app import create_app  # noqa: E402
from app.models import AccessKey, db, get_configured_local_now  # noqa: E402

API_HEADERS = {"X-INCAS-Api": "1"}


@pytest.fixture()
def app():
    app = create_app()
    app.config["TESTING"] = True
    yield app
    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def create_access_key(app, phrase, scopes):
    with app.app_context():
        db.session.add(
            AccessKey(
                key=phrase,
                scopes=__import__("json").dumps(scopes),
                expires_at=get_configured_local_now() + timedelta(days=1),
            )
        )
        db.session.commit()


def unlock(client, app, phrase, scopes):
    create_access_key(app, phrase, scopes)
    response = client.post(
        "/api/v1/access/unlock", json={"key": phrase}, headers=API_HEADERS
    )
    assert response.status_code == 200, response.get_json()
    return response.get_json()
