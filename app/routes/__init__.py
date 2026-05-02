from importlib import import_module

from flask import Blueprint

bp = Blueprint("main", __name__)

for module_name in (
    "app.routes.public",
    "app.routes.admin_posts",
    "app.routes.admin_event_registrations",
    "app.routes.admin_auth",
    "app.routes.admin_language_tandem",
    "app.routes.admin_forms",
    "app.routes.admin_access_keys",
):
    import_module(module_name)
