import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    APP_NAME = "INCAS"
    LOCAL_TIMEZONE = os.getenv("LOCAL_TIMEZONE", "Europe/Berlin")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///incas.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    ACCESS_HASHES = {
        "access_keys": "9e27c273f5901114167b759edaeb402f290980fe723d1b05f8afc82f0c874d8e",
    }
    INSTAGRAM_APP_ID = os.getenv("INSTAGRAM_APP_ID", "")
    INSTAGRAM_APP_SECRET = os.getenv("INSTAGRAM_APP_SECRET", "")
    INSTAGRAM_REDIRECT_URI = os.getenv("INSTAGRAM_REDIRECT_URI", "")
    INSTAGRAM_SCOPES = os.getenv(
        "INSTAGRAM_SCOPES",
        "instagram_business_basic,instagram_business_content_publish",
    )
