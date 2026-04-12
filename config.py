import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    ADMIN_PHRASE = os.getenv("ADMIN_PHRASE", "dev-admin")
    APP_NAME = "INCAS"
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///incas.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
