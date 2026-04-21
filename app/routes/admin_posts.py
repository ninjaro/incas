from flask import current_app, flash, redirect, render_template, request, url_for

from app.models import InstagramConnection, Post, db
from app.routes import bp
from app.routes.helpers.access import require_scope
from app.routes.helpers.content import parse_starts_at, unique_slug


@bp.route("/admin/posts")
def admin_posts():
    guard = require_scope("posts")
    if guard:
        return guard

    items = Post.query.order_by(Post.updated_at.desc()).all()
    instagram_connection = (
        InstagramConnection.query
        .filter_by(is_active=True)
        .order_by(InstagramConnection.updated_at.desc())
        .first()
    )
    return render_template(
        "admin/posts/index.html",
        items=items,
        instagram_connection=instagram_connection,
    )

@bp.route("/admin/posts/instagram/connect")
def admin_posts_instagram_connect():
    guard = require_scope("posts")
    if guard:
        return guard

    if not current_app.config.get("INSTAGRAM_APP_ID"):
        flash("Missing INSTAGRAM_APP_ID.")
        return redirect(url_for("main.admin_posts"))

    if not current_app.config.get("INSTAGRAM_APP_SECRET"):
        flash("Missing INSTAGRAM_APP_SECRET.")
        return redirect(url_for("main.admin_posts"))

    if not current_app.config.get("INSTAGRAM_REDIRECT_URI"):
        flash("Missing INSTAGRAM_REDIRECT_URI.")
        return redirect(url_for("main.admin_posts"))

    flash("Instagram OAuth redirect not wired yet.")
    return redirect(url_for("main.admin_posts"))


@bp.route("/admin/posts/instagram/disconnect", methods=["POST"])
def admin_posts_instagram_disconnect():
    guard = require_scope("posts")
    if guard:
        return guard

    item = (
        InstagramConnection.query
        .filter_by(is_active=True)
        .order_by(InstagramConnection.updated_at.desc())
        .first()
    )
    if item:
        item.is_active = False
        db.session.commit()
        flash("Instagram disconnected.")
    else:
        flash("No active Instagram connection.")

    return redirect(url_for("main.admin_posts"))

@bp.route("/admin/posts/new", methods=["GET", "POST"])
def admin_post_create():
    guard = require_scope("posts")
    if guard:
        return guard

    values = {
        "title": "",
        "image_url": "",
        "body": "",
        "starts_at": "",
        "is_active": True,
        "is_pinned": False,
        "event_kind": "",
        "instagram_media_id": "",
        "instagram_permalink": "",
    }

    if request.method == "POST":
        values["title"] = request.form.get("title", "").strip()
        values["image_url"] = request.form.get("image_url", "").strip()
        values["body"] = request.form.get("body", "").strip()
        values["starts_at"] = request.form.get("starts_at", "").strip()
        values["is_active"] = request.form.get("is_active") == "on"
        values["is_pinned"] = request.form.get("is_pinned") == "on"
        values["event_kind"] = request.form.get("event_kind", "").strip()
        values["instagram_media_id"] = request.form.get("instagram_media_id", "").strip()
        values["instagram_permalink"] = request.form.get("instagram_permalink", "").strip()

        if not values["title"]:
            flash("Title is required.")
            return render_template("admin/posts/form.html", values=values, item=None)

        item = Post(
            slug=unique_slug(values["title"]),
            title=values["title"],
            image_url=values["image_url"],
            body=values["body"],
            starts_at=parse_starts_at(values["starts_at"]),
            is_active=values["is_active"],
            is_pinned=values["is_pinned"],
            event_kind=values["event_kind"] or None,
            instagram_media_id=values["instagram_media_id"],
            instagram_permalink=values["instagram_permalink"],
        )
        db.session.add(item)
        db.session.commit()
        return redirect(url_for("main.admin_posts"))

    return render_template("admin/posts/form.html", values=values, item=None)


@bp.route("/admin/posts/<int:post_id>/edit", methods=["GET", "POST"])
def admin_post_edit(post_id):
    guard = require_scope("posts")
    if guard:
        return guard

    item = Post.query.get_or_404(post_id)

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        image_url = request.form.get("image_url", "").strip()
        body = request.form.get("body", "").strip()
        starts_at_raw = request.form.get("starts_at", "").strip()
        is_active = request.form.get("is_active") == "on"
        is_pinned = request.form.get("is_pinned") == "on"
        event_kind = request.form.get("event_kind", "").strip()
        instagram_media_id = request.form.get("instagram_media_id", "").strip()
        instagram_permalink = request.form.get("instagram_permalink", "").strip()

        if not title:
            flash("Title is required.")
            values = {
                "title": title,
                "image_url": image_url,
                "body": body,
                "starts_at": starts_at_raw,
                "is_active": is_active,
                "is_pinned": is_pinned,
                "event_kind": event_kind,
                "instagram_media_id": instagram_media_id,
                "instagram_permalink": instagram_permalink,
            }
            return render_template("admin/posts/form.html", values=values, item=item)

        item.title = title
        item.slug = unique_slug(title, current_id=item.id)
        item.image_url = image_url
        item.body = body
        item.starts_at = parse_starts_at(starts_at_raw)
        item.is_active = is_active
        item.is_pinned = is_pinned
        item.event_kind = event_kind or None
        item.instagram_media_id = instagram_media_id
        item.instagram_permalink = instagram_permalink

        db.session.commit()
        return redirect(url_for("main.admin_posts"))

    values = {
        "title": item.title,
        "image_url": item.image_url,
        "body": item.body,
        "starts_at": item.starts_at.strftime("%Y-%m-%dT%H:%M") if item.starts_at else "",
        "is_active": item.is_active,
        "is_pinned": item.is_pinned,
        "event_kind": item.event_kind or "",
        "instagram_media_id": item.instagram_media_id,
        "instagram_permalink": item.instagram_permalink,
    }

    return render_template("admin/posts/form.html", values=values, item=item)
