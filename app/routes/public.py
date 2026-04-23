import calendar
import json
from datetime import date, datetime

from flask import abort, flash, g, make_response, redirect, render_template, request, url_for

from app.models import ContactRequest, EventSuggestion, LanguageTandemRequest, Post, db
from app.routes import bp
from app.routes.helpers.content import parse_calendar_month
from app.routes.helpers.tandem_form import (
    build_language_tandem_form_context,
    normalize_country_code,
    normalize_language_codes,
    parse_birth_year,
    parse_departure_date,
    render_language_tandem_form_page,
)
from app.site_content import get_site_page

SUPPORTED_LOCALES = {"en", "de"}
DEFAULT_LOCALE = "en"


@bp.route("/")
def index():
    items = Post.query.order_by(Post.created_at.desc()).all()

    live_events = [item for item in items if item.is_event and item.is_live]
    live_posts = [item for item in items if not item.is_event and item.is_live]
    archived_items = [item for item in items if not item.is_live]

    active_items = live_events + live_posts
    active_items.sort(
        key=lambda item: (
            not item.is_pinned,
            0 if item.is_event else 1,
            item.starts_at or datetime.max,
            -item.updated_at.timestamp(),
        )
    )

    archived_items.sort(
        key=lambda item: item.ends_at if item.is_event else item.updated_at,
        reverse=True,
    )

    return render_template(
        "index.html",
        active_items=active_items,
        archived_items=archived_items,
    )

@bp.before_app_request
def detect_locale():
    locale = request.cookies.get("locale", DEFAULT_LOCALE)
    g.locale = locale if locale in SUPPORTED_LOCALES else DEFAULT_LOCALE


@bp.route("/set-locale/<locale>")
def set_locale(locale):
    locale = locale if locale in SUPPORTED_LOCALES else DEFAULT_LOCALE
    response = make_response(redirect(request.referrer or url_for("main.index")))
    response.set_cookie("locale", locale, max_age=60 * 60 * 24 * 365)
    return response


@bp.route("/about")
def about():
    page = get_site_page("about", g.locale)
    return render_template("site_page.html", page=page)

@bp.route("/about/working-groups")
def working_groups():
    page = get_site_page("working_groups", g.locale)
    return render_template("site_page.html", page=page)

@bp.route("/about/team-meetings")
def team_meetings():
    page = get_site_page("team_meetings", g.locale)
    return render_template("site_page.html", page=page)

def get_contact_links():
    return [
        {
            "title": "Language Tandem",
            "url": url_for("main.language_tandem_form"),
            "description": "Register for the tandem matching form.",
        },
        {
            "title": "Suggest an International Tuesday",
            "url": url_for("main.suggest_event_form", kind="country_evening"),
            "description": "Suggest a country evening or Tuesday activity.",
        },
        {
            "title": "Suggest an International Breakfast",
            "url": url_for("main.suggest_event_form", kind="breakfast"),
            "description": "Suggest a breakfast event.",
        },
        {
            "title": "Contact / Questions",
            "url": url_for("main.contact_form"),
            "description": "Send us a message directly.",
        },
    ]

@bp.route("/contacts")
def contacts():
    return render_template("contacts.html", links=get_contact_links())

@bp.route("/contact-form", methods=["GET", "POST"])
def contact_form():
    values = {
        "name": "",
        "email": "",
        "subject": "",
        "message": "",
    }

    if request.method == "POST":
        values["name"] = request.form.get("name", "").strip()
        values["email"] = request.form.get("email", "").strip()
        values["subject"] = request.form.get("subject", "").strip()
        values["message"] = request.form.get("message", "").strip()

        if not values["name"] or not values["email"] or not values["message"]:
            flash("Name, email, and message are required.")
            return render_template("forms/contact.html", values=values)

        item = ContactRequest(
            name=values["name"],
            email=values["email"],
            subject=values["subject"],
            message=values["message"],
        )

        db.session.add(item)
        db.session.commit()

        flash("Your message has been submitted.")
        return redirect(url_for("main.contact_form"))

    return render_template("forms/contact.html", values=values)

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

def render_site_content_page(page_key):
    page = get_site_page(page_key, g.locale)

    values = {}
    form_preset_kind = None
    form_action = None
    extra_context = {}

    if page.get("form", {}).get("type") == "suggest_event":
        form_preset_kind = page["form"].get("preset", {}).get("kind")
        values = {
            "kind": form_preset_kind or "",
            "country": "",
            "contact_name": "",
            "contact_email": "",
            "contact_phone": "",
            "comment": "",
        }
        form_action = url_for("main.suggest_event_form")

    elif page.get("form", {}).get("type") == "language_tandem":
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
            "offered_language_levels": {},
            "requested_languages": [],
            "requested_native_only": False,
            "same_gender_only": False,
            "comment": "",
        }
        form_action = url_for("main.language_tandem_form")
        extra_context = build_language_tandem_form_context(values)

    return render_template(
        "site_page.html",
        page=page,
        values=values,
        form_preset_kind=form_preset_kind,
        form_action=form_action,
        form_return_to=f"{request.path}#page-form",
        **extra_context,
    )

@bp.route("/offers")
def offers():
    return render_site_content_page("offers")

@bp.route("/offers/international-breakfast")
def international_breakfast():
    return render_site_content_page("international_breakfast")


@bp.route("/offers/international-weekend")
def international_weekend():
    return render_site_content_page("international_weekend")


@bp.route("/offers/cafe-lingua")
def cafe_lingua():
    return render_site_content_page("cafe_lingua")


@bp.route("/offers/incas-active")
def incas_active():
    return render_site_content_page("incas_active")


@bp.route("/offers/country-evening")
def country_evening():
    return render_site_content_page("country_evening")


@bp.route("/offers/international-tuesday")
def international_tuesday():
    return render_site_content_page("international_tuesday")

@bp.route("/offers/language-tandem")
def offer_language_tandem():
    return render_site_content_page("language_tandem")

@bp.route("/calendar")
def calendar_view():
    year, month = parse_calendar_month(request.args.get("month"))

    month_matrix = calendar.Calendar(firstweekday=0).monthdatescalendar(year, month)
    visible_start = month_matrix[0][0]
    visible_end = month_matrix[-1][-1]
    visible_start_at = datetime(visible_start.year, visible_start.month, visible_start.day)
    visible_end_at = datetime(visible_end.year, visible_end.month, visible_end.day, 23, 59, 59)

    items = (
        Post.query
        .filter(Post.starts_at.isnot(None))
        .filter(Post.starts_at >= visible_start_at)
        .filter(Post.starts_at <= visible_end_at)
        .order_by(Post.starts_at.asc())
        .all()
    )
    month_items = [
        item for item in items
        if item.starts_at.year == year and item.starts_at.month == month
    ]
    upcoming_items = [item for item in month_items if item.is_live]
    archived_items = [item for item in month_items if not item.is_live]

    upcoming_items.sort(key=lambda item: item.starts_at)
    archived_items.sort(key=lambda item: item.ends_at, reverse=True)

    now_utc = datetime.utcnow()

    events_by_day = {}

    for item in items:
        key = item.starts_at.date()
        events_by_day.setdefault(key, []).append(item)

    agenda_days = [
        {"date": day, "items": events_by_day.get(day, [])}
        for week in month_matrix
        for day in week
        if day.month == month and events_by_day.get(day)
    ]

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
        current_month_value=f"{year:04d}-{month:02d}",
        prev_month_value=f"{prev_year:04d}-{prev_month:02d}",
        next_month_value=f"{next_year:04d}-{next_month:02d}",
        today_month_value=f"{date.today().year:04d}-{date.today().month:02d}",
        agenda_days=agenda_days,
        upcoming_items=upcoming_items,
        archived_items=archived_items,
        now_utc=now_utc,
        today=date.today(),
    )

@bp.route("/suggest-event", methods=["GET", "POST"])
def suggest_event_form():
    return_to = request.form.get("return_to", "").strip() if request.method == "POST" else ""
    values = {
        "kind": request.args.get("kind", "").strip(),
        "country": "",
        "contact_name": "",
        "contact_email": "",
        "contact_phone": "",
        "comment": "",
    }

    if request.method == "POST":
        values["kind"] = request.form.get("kind", "").strip()
        values["country"] = request.form.get("country", "").strip()
        values["contact_name"] = request.form.get("contact_name", "").strip()
        values["contact_email"] = request.form.get("contact_email", "").strip()
        values["contact_phone"] = request.form.get("contact_phone", "").strip()
        values["comment"] = request.form.get("comment", "").strip()

        if values["kind"] not in {"country_evening", "breakfast"}:
            flash("Select a valid event type.")
            return render_template("forms/suggest_event.html", values=values)

        if not values["country"]:
            flash("Country is required.")
            return render_template("forms/suggest_event.html", values=values)

        if not values["contact_name"]:
            flash("Contact name is required.")
            return render_template("forms/suggest_event.html", values=values)

        if not values["contact_email"] and not values["contact_phone"]:
            flash("Enter at least email or phone.")
            return render_template("forms/suggest_event.html", values=values)

        item = EventSuggestion(
            kind=values["kind"],
            country=values["country"],
            contact_name=values["contact_name"],
            contact_email=values["contact_email"],
            contact_phone=values["contact_phone"],
            comment=values["comment"],
        )

        db.session.add(item)
        db.session.commit()

        flash("Your event suggestion has been submitted.")
        return redirect(return_to or url_for("main.suggest_event_form"))

    return render_template("forms/suggest_event.html", values=values)

@bp.route("/language-tandem", methods=["GET", "POST"])
def language_tandem_form():
    return_to = request.form.get("return_to", "").strip() if request.method == "POST" else ""
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
        "offered_language_levels": {},
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
        values["requested_languages"] = normalize_language_codes(request.form.getlist("requested_languages"))
        values["requested_native_only"] = request.form.get("requested_native_only") == "on"
        values["same_gender_only"] = request.form.get("same_gender_only") == "on"
        values["comment"] = request.form.get("comment", "").strip()

        valid_levels = {"1", "2", "3", "4", "5"}
        try:
            raw_levels = json.loads(request.form.get("offered_language_levels", "{}"))
            raw_levels = raw_levels if isinstance(raw_levels, dict) else {}
        except (TypeError, ValueError):
            raw_levels = {}
        valid_offered = set(values["offered_languages"])
        offered_language_levels = {
            k: v for k, v in raw_levels.items()
            if k in valid_offered and v in valid_levels
        }
        values["offered_language_levels"] = offered_language_levels

        offered_native_languages = [
            code for code in values["offered_languages"]
            if offered_language_levels.get(code) == "5"
        ]
        values["offered_native_languages"] = offered_native_languages

        birth_year = parse_birth_year(values["birth_year"])
        departure_date = parse_departure_date(values["departure_date"])

        resolved_occupation = (
            values["occupation_other"]
            if values["occupation"] == "other"
            else values["occupation"]
        )

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
            offered_language_levels=json.dumps(offered_language_levels),
            requested_languages=json.dumps(values["requested_languages"]),
            requested_native_only=values["requested_native_only"],
            same_gender_only=values["same_gender_only"],
            comment=values["comment"],
        )

        db.session.add(item)
        db.session.commit()

        flash("Your request has been submitted.")
        return redirect(return_to or url_for("main.language_tandem_form"))

    return render_language_tandem_form_page(values)
