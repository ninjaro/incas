import calendar
import json
from datetime import datetime

from flask import flash, redirect, render_template, request, url_for

from app.models import LanguageTandemRequest, Post, db
from app.routes import bp
from app.routes.helpers.content import parse_calendar_month
from app.routes.helpers.tandem_form import (
    normalize_country_code,
    normalize_language_codes,
    parse_birth_year,
    parse_departure_date,
    render_language_tandem_form_page,
)


@bp.route("/")
def index():
    items = Post.query.order_by(Post.created_at.desc()).all()

    live_events = [item for item in items if item.is_event and item.is_live]
    live_posts = [item for item in items if not item.is_event and item.is_live]
    archived_items = [item for item in items if not item.is_live]

    live_events.sort(key=lambda item: item.starts_at)
    live_posts.sort(key=lambda item: item.updated_at, reverse=True)
    archived_items.sort(
        key=lambda item: item.ends_at if item.is_event else item.updated_at,
        reverse=True,
    )

    active_items = live_events + live_posts

    return render_template(
        "index.html",
        active_items=active_items,
        archived_items=archived_items,
    )


@bp.route("/about")
def about():
    return render_template("about.html")


@bp.route("/contacts")
def contacts():
    return render_template("contacts.html")


@bp.route("/posts")
def posts():
    items = Post.query.order_by(Post.created_at.desc()).all()
    return render_template("posts.html", items=items, page_title="Posts")


@bp.route("/events")
def events():
    items = (
        Post.query
        .filter(Post.starts_at.isnot(None))
        .order_by(Post.starts_at.asc())
        .all()
    )
    return render_template("posts.html", items=items, page_title="Events")


@bp.route("/content/<slug>")
def post_detail(slug):
    item = Post.query.filter_by(slug=slug).first_or_404()
    return render_template("post_detail.html", item=item)

def get_public_forms():
    return [
        {
            "slug": "language-tandem",
            "title": "Language Tandem",
            "nav_title": "Language Tandem",
            "teaser": "Find a tandem partner for language exchange.",
            "description": "Choose offered and requested languages and submit your tandem request.",
            "url": url_for("main.language_tandem_form"),
            "is_active": True,
            "category": "Community",
        },
        # {
        #     "slug": "housing",
        #     "title": "Housing Support",
        #     "nav_title": "Housing",
        #     "teaser": "Ask for housing-related support.",
        #     "description": "Longer description for the forms page.",
        #     "url": "#",
        #     "is_active": False,
        #     "category": "Support",
        # },
    ]


@bp.route("/forms")
def forms_index():
    return render_template("forms/index.html", forms=get_public_forms())

@bp.route("/calendar")
def calendar_view():
    year, month = parse_calendar_month(request.args.get("month"))

    month_matrix = calendar.Calendar(firstweekday=0).monthdatescalendar(year, month)
    month_start = datetime(year, month, 1)
    month_end_day = calendar.monthrange(year, month)[1]
    month_end = datetime(year, month, month_end_day, 23, 59, 59)

    items = (
        Post.query
        .filter(Post.starts_at.isnot(None))
        .filter(Post.starts_at >= month_start)
        .filter(Post.starts_at <= month_end)
        .order_by(Post.starts_at.asc())
        .all()
    )

    events_by_day = {}

    for item in items:
        key = item.starts_at.date()
        events_by_day.setdefault(key, []).append(item)

    prev_year = year
    prev_month = month - 1
    if prev_month == 0:
        prev_month = 12
        prev_year -= 1

    next_year = year
    next_month = month + 1
    if next_month == 13:
        next_month = 1
        next_year += 1

    return render_template(
        "calendar.html",
        month_matrix=month_matrix,
        events_by_day=events_by_day,
        current_year=year,
        current_month=month,
        month_label=datetime(year, month, 1).strftime("%B %Y"),
        prev_month_value=f"{prev_year:04d}-{prev_month:02d}",
        next_month_value=f"{next_year:04d}-{next_month:02d}",
    )

@bp.route("/language-tandem", methods=["GET", "POST"])
def language_tandem_form():
    values = {
        "first_name": "",
        "last_name": "",
        "email": "",
        "occupation": "",
        "occupation_other": "",
        "gender": "",
        "birth_year": "",
        "departure_date": "",
        "country_of_origin": "",
        "offered_languages": [],
        "offered_native_languages": [],
        "requested_languages": [],
        "requested_native_only": False,
        "same_gender_only": False,
        "comment": "",
    }

    if request.method == "POST":
        values["first_name"] = request.form.get("first_name", "").strip()
        values["last_name"] = request.form.get("last_name", "").strip()
        values["email"] = request.form.get("email", "").strip()
        values["occupation"] = request.form.get("occupation", "").strip()
        values["occupation_other"] = request.form.get("occupation_other", "").strip()
        values["gender"] = request.form.get("gender", "").strip()
        values["birth_year"] = request.form.get("birth_year", "").strip()
        values["departure_date"] = request.form.get("departure_date", "").strip()
        values["country_of_origin"] = normalize_country_code(request.form.get("country_of_origin"))
        values["offered_languages"] = normalize_language_codes(request.form.getlist("offered_languages"))
        values["offered_native_languages"] = normalize_language_codes(
            request.form.getlist("offered_native_languages")
        )
        values["requested_languages"] = normalize_language_codes(request.form.getlist("requested_languages"))
        values["requested_native_only"] = request.form.get("requested_native_only") == "on"
        values["same_gender_only"] = request.form.get("same_gender_only") == "on"
        values["comment"] = request.form.get("comment", "").strip()

        birth_year = parse_birth_year(values["birth_year"])
        departure_date = parse_departure_date(values["departure_date"])

        resolved_occupation = (
            values["occupation_other"]
            if values["occupation"] == "other"
            else values["occupation"]
        )

        offered_native_languages = [
            code for code in values["offered_native_languages"]
            if code in values["offered_languages"]
        ]
        values["offered_native_languages"] = offered_native_languages

        if not values["first_name"] or not values["last_name"] or not values["email"]:
            flash("First name, last name, and email are required.")
            return render_language_tandem_form_page(values)

        if not values["occupation"] or not values["gender"] or not values["country_of_origin"]:
            flash("Occupation, gender, and country of origin are required.")
            return render_language_tandem_form_page(values)

        if values["occupation"] == "other" and not values["occupation_other"]:
            flash("Enter occupation.")
            return render_language_tandem_form_page(values)

        if birth_year is None:
            flash("Enter a valid birth year.")
            return render_language_tandem_form_page(values)

        if departure_date is None:
            flash("Enter a valid departure date.")
            return render_language_tandem_form_page(values)

        if not values["offered_languages"]:
            flash("Select at least one offered language.")
            return render_language_tandem_form_page(values)

        if not values["requested_languages"]:
            flash("Select at least one requested language.")
            return render_language_tandem_form_page(values)

        item = LanguageTandemRequest(
            first_name=values["first_name"],
            last_name=values["last_name"],
            email=values["email"],
            occupation=resolved_occupation,
            gender=values["gender"],
            birth_year=birth_year,
            departure_date=departure_date,
            country_of_origin=values["country_of_origin"],
            offered_languages=json.dumps(values["offered_languages"]),
            offered_native_languages=json.dumps(offered_native_languages),
            requested_languages=json.dumps(values["requested_languages"]),
            requested_native_only=values["requested_native_only"],
            same_gender_only=values["same_gender_only"],
            comment=values["comment"],
        )

        db.session.add(item)
        db.session.commit()

        flash("Your request has been submitted.")
        return redirect(url_for("main.language_tandem_form"))

    return render_language_tandem_form_page(values)
