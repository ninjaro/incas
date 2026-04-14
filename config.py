import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    APP_NAME = "INCAS"
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///incas.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    ACCESS_HASHES = {
    "posts": "f7ad4b9a8a02154df95cd3c79e12e54efeaa9647b55632b18bacdb47033fefb0",
    "language_tandem": "7a98ddc581d6ab06adeb6912deafc9a06f98fc694f83b0f3ad982e400798fc41",
    "language_tandem_corrections": "3257fee136823bca36642b8ccad6a2e4f87f7e93ce3f9e59b77499ed2fcd3f8c",
}
