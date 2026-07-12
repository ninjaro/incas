import pytest

from app import create_app
from app.models import db
from app.rate_limit import consume_rate_limit


STRONG_SECRET = "a-production-secret-with-more-than-32-random-characters"


def production_config(**overrides):
    values = {
        "APP_ENV": "production",
        "SECRET_KEY": STRONG_SECRET,
        "ACCESS_HASHES": {"access_keys": "f" * 64},
        "SQLALCHEMY_DATABASE_URI": "postgresql+psycopg://incas:secret@db/incas",
        "AUTO_CREATE_SCHEMA": False,
        "SEED_DEMO_DATA": False,
        "SESSION_COOKIE_SECURE": True,
        "REACT_PRIMARY_FRONTEND": False,
    }
    values.update(overrides)
    return values


@pytest.mark.parametrize(
    "override, message",
    [
        ({"SECRET_KEY": "short"}, "SECRET_KEY"),
        ({"SQLALCHEMY_DATABASE_URI": "sqlite:///production.db"}, "PostgreSQL"),
        ({"AUTO_CREATE_SCHEMA": True}, "AUTO_CREATE_SCHEMA"),
        ({"SEED_DEMO_DATA": True}, "SEED_DEMO_DATA"),
        ({"SESSION_COOKIE_SECURE": False}, "SESSION_COOKIE_SECURE"),
        ({"ACCESS_HASHES": {"access_keys": "9e27c273f5901114167b759edaeb402f290980fe723d1b05f8afc82f0c874d8e"}}, "ACCESS_KEYS_ROOT_HASH"),
    ],
)
def test_unsafe_production_configuration_fails_fast(override, message):
    with pytest.raises(RuntimeError, match=message):
        create_app(production_config(**override))


def test_complete_production_configuration_is_accepted_without_connecting():
    app = create_app(production_config())
    assert app.config["SESSION_COOKIE_HTTPONLY"] is True
    assert app.config["SESSION_COOKIE_SAMESITE"] == "Lax"


def test_database_rate_limit_resets_and_scopes_are_independent(app):
    with app.test_request_context("/", environ_base={"REMOTE_ADDR": "192.0.2.10"}):
        assert consume_rate_limit("one", 1, 10, now_epoch=100)[0] is True
        assert consume_rate_limit("one", 1, 10, now_epoch=100)[0] is False
        assert consume_rate_limit("two", 1, 10, now_epoch=100)[0] is True
        assert consume_rate_limit("one", 1, 10, now_epoch=110)[0] is True


def _proxy_test_app(tmp_path, *, trust_proxy):
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{tmp_path / ('trusted.sqlite' if trust_proxy else 'direct.sqlite')}",
            "AUTO_CREATE_SCHEMA": True,
            "SEED_DEMO_DATA": False,
            "REACT_PRIMARY_FRONTEND": False,
            "TRUST_PROXY_HEADERS": trust_proxy,
            "TRUSTED_PROXY_COUNT": 1,
        }
    )

    @app.get("/_rate-test")
    def rate_test():
        allowed, _ = consume_rate_limit("proxy-test", 1, 3600)
        return ("allowed", 200) if allowed else ("limited", 429)

    return app


def test_forwarded_ip_is_ignored_until_proxy_trust_is_enabled(tmp_path):
    direct = _proxy_test_app(tmp_path, trust_proxy=False)
    direct_client = direct.test_client()
    assert direct_client.get("/_rate-test", headers={"X-Forwarded-For": "198.51.100.1"}).status_code == 200
    assert direct_client.get("/_rate-test", headers={"X-Forwarded-For": "198.51.100.2"}).status_code == 429

    trusted = _proxy_test_app(tmp_path, trust_proxy=True)
    trusted_client = trusted.test_client()
    assert trusted_client.get("/_rate-test", headers={"X-Forwarded-For": "198.51.100.1"}).status_code == 200
    assert trusted_client.get("/_rate-test", headers={"X-Forwarded-For": "198.51.100.2"}).status_code == 200
    assert trusted_client.get("/_rate-test", headers={"X-Forwarded-For": "198.51.100.2"}).status_code == 429

    with direct.app_context():
        db.session.remove()
        db.drop_all()
    with trusted.app_context():
        db.session.remove()
        db.drop_all()
