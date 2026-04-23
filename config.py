import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    APP_NAME = "INCAS"
    LOCAL_TIMEZONE = os.getenv("LOCAL_TIMEZONE", "Europe/Berlin")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///incas.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    ACCESS_HASHES = {
        "posts": "f7ad4b9a8a02154df95cd3c79e12e54efeaa9647b55632b18bacdb47033fefb0",
        "language_tandem": "7a98ddc581d6ab06adeb6912deafc9a06f98fc694f83b0f3ad982e400798fc41",
        "language_tandem_corrections": "3257fee136823bca36642b8ccad6a2e4f87f7e93ce3f9e59b77499ed2fcd3f8c",
        "forms": "d7e7a4454d88272d079a60444b93c35dc600392fc5b3e9554ac9e2f95073a7b3",
        "access_keys": "9e27c273f5901114167b759edaeb402f290980fe723d1b05f8afc82f0c874d8e",
    }
    INSTAGRAM_APP_ID = os.getenv("INSTAGRAM_APP_ID", "")
    INSTAGRAM_APP_SECRET = os.getenv("INSTAGRAM_APP_SECRET", "")
    INSTAGRAM_REDIRECT_URI = os.getenv("INSTAGRAM_REDIRECT_URI", "")
    INSTAGRAM_SCOPES = os.getenv(
        "INSTAGRAM_SCOPES",
        "instagram_business_basic,instagram_business_content_publish",
    )
