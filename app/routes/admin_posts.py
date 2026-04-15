from flask import flash, redirect, render_template, request, url_for

from app.models import Post, db
from app.routes import bp
from app.routes.helpers.access import require_scope
from app.routes.helpers.content import parse_starts_at, unique_slug


@bp.route("/admin/posts")
def admin_posts():
    guard = require_scope("posts")
    if guard:
        return guard

    items = Post.query.order_by(Post.updated_at.desc()).all()
    return render_template("admin/posts/index.html", items=items)


@bp.route("/admin/posts/new", methods=["GET", "POST"])
def admin_post_create():
    guard = require_scope("posts")
    if guard:
        return guard

    values = {
        "title": "",
        "summary": "",
        "body": "",
        "starts_at": "",
        "is_active": True,
    }

    if request.method == "POST":
        values["title"] = request.form.get("title", "").strip()
        values["summary"] = request.form.get("summary", "").strip()
        values["body"] = request.form.get("body", "").strip()
        values["starts_at"] = request.form.get("starts_at", "").strip()
        values["is_active"] = request.form.get("is_active") == "on"

        if not values["title"]:
            flash("Title is required.")
            return render_template("admin/posts/form.html", values=values, item=None)

        item = Post(
            slug=unique_slug(values["title"]),
            title=values["title"],
            summary=values["summary"],
            body=values["body"],
            starts_at=parse_starts_at(values["starts_at"]),
            is_active=values["is_active"],
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
        summary = request.form.get("summary", "").strip()
        body = request.form.get("body", "").strip()
        starts_at_raw = request.form.get("starts_at", "").strip()
        is_active = request.form.get("is_active") == "on"

        if not title:
            flash("Title is required.")
            values = {
                "title": title,
                "summary": summary,
                "body": body,
                "starts_at": starts_at_raw,
                "is_active": is_active,
            }
            return render_template("admin/posts/form.html", values=values, item=item)

        item.title = title
        item.slug = unique_slug(title, current_id=item.id)
        item.summary = summary
        item.body = body
        item.starts_at = parse_starts_at(starts_at_raw)
        item.is_active = is_active

        db.session.commit()
        return redirect(url_for("main.admin_posts"))

    values = {
        "title": item.title,
        "summary": item.summary,
        "body": item.body,
        "starts_at": item.starts_at.strftime("%Y-%m-%dT%H:%M") if item.starts_at else "",
        "is_active": item.is_active,
    }

    return render_template("admin/posts/form.html", values=values, item=item)
