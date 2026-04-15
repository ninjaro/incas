from importlib import import_module

from flask import Blueprint

bp = Blueprint("main", __name__)

for module_name in (
    "app.routes.public",
    "app.routes.admin_posts",
    "app.routes.admin_auth",
    "app.routes.admin_language_tandem",
):
    import_module(module_name)
