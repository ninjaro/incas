import calendar
import json
from datetime import datetime

from flask import abort, flash, g, make_response, redirect, render_template, request, url_for

from app.models import ContactRequest, EventRegistration, EventSuggestion, LanguageTandemRequest, Post, db, get_configured_local_now
from app.routes import bp
from app.routes.helpers.access import has_scope
from app.routes.helpers.content import parse_calendar_month
from app.routes.helpers.event_registrations import (
    build_event_registration_form_values,
    build_event_registration_public_id,
    build_event_registration_status_context,
    build_post_registration_summary,
    determine_initial_registration_status,
    get_event_registration_template_context,
    resolve_event_registration_occupation,
    should_collect_diet_preference,
)
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
EVENT_KIND_ORDER = [
    "country_evening",
    "cafe_lingua",
    "breakfast",
    "board_games",
    "dance",
    "trip",
    "karaoke",
    "housing",
]
CALENDAR_MODES = {"default", "mini", "agenda", "timeline", "cards", "hardcore"}


def get_local_now():
    return get_configured_local_now()


def get_public_posts_query():
    return Post.query.filter(Post.is_active.is_(True))


def get_visible_post_or_404(slug):
    item = Post.query.filter_by(slug=slug).first_or_404()
    if not has_scope("posts") and not item.is_publicly_accessible:
        abort(404)
    return item


@bp.route("/")
def index():
    items = [
        item for item in get_public_posts_query().order_by(Post.created_at.desc()).all()
        if item.is_publicly_accessible
    ]

    live_events = [item for item in items if item.is_event and item.is_live]
    live_posts = [item for item in items if not item.is_event and item.is_live]
    archived_items = [item for item in items if item.is_event and not item.is_live]

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
    errors = {}

    if request.method == "POST":
        values["name"] = request.form.get("name", "").strip()
        values["email"] = request.form.get("email", "").strip()
        values["subject"] = request.form.get("subject", "").strip()
        values["message"] = request.form.get("message", "").strip()

        if not values["name"]:
            errors["name"] = "Name is required."
        if not values["email"]:
            errors["email"] = "Email is required."
        if not values["message"]:
            errors["message"] = "Message is required."

        if errors:
            return render_template("forms/contact.html", values=values, errors=errors)

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

    return render_template("forms/contact.html", values=values, errors=errors)

@bp.route("/posts")
def posts():
    items = [
        item for item in get_public_posts_query().order_by(Post.created_at.desc()).all()
        if item.is_publicly_accessible and not item.is_event
    ]
    return render_template("posts.html", items=items, page_title="Posts")


@bp.route("/events")
def events():
    items = (
        get_public_posts_query()
        .filter(Post.starts_at.isnot(None))
        .order_by(Post.starts_at.asc())
        .all()
    )
    items = [item for item in items if item.is_publicly_accessible]
    return render_template("posts.html", items=items, page_title="Events")


@bp.route("/content/<slug>")
def post_detail(slug):
    item = get_visible_post_or_404(slug)
    return render_template(
        "post_detail.html",
        item=item,
        registration_summary=build_post_registration_summary(item),
    )


@bp.route("/content/<slug>/register", methods=["GET", "POST"])
def event_registration_form(slug):
    item = get_visible_post_or_404(slug)

    if not item.has_registration_queue:
        abort(404)

    if not item.is_live and not has_scope("posts"):
        flash("Registrations are closed for this event.")
        return redirect(url_for("main.post_detail", slug=item.slug))

    values = build_event_registration_form_values(item)
    errors = {}

    if request.method == "POST":
        values["first_name"] = request.form.get("first_name", "").strip()
        values["last_name"] = request.form.get("last_name", "").strip()
        values["email"] = request.form.get("email", "").strip()
        values["occupation"] = request.form.get("occupation", "").strip()
        values["occupation_other"] = request.form.get("occupation_other", "").strip()
        values["diet_preference"] = request.form.get("diet_preference", "").strip()
        values["comment"] = request.form.get("comment", "").strip()

        if not values["first_name"]:
            errors["first_name"] = "First name is required."
        if not values["last_name"]:
            errors["last_name"] = "Last name is required."
        if not values["email"]:
            errors["email"] = "Email is required."
        if not values["occupation"]:
            errors["occupation"] = "Occupation is required."
        if values["occupation"] == "other" and not values["occupation_other"]:
            errors["occupation_other"] = "Enter occupation."

        if should_collect_diet_preference(item):
            if values["diet_preference"] not in {"vegan", "vegetarian", "omnivore"}:
                errors["diet_preference"] = "Select a meal preference."
        else:
            values["diet_preference"] = ""

        if errors:
            return render_template(
                "forms/event_registration.html",
                registration_summary=build_post_registration_summary(item),
                **get_event_registration_template_context(item, values, errors),
            )

        registration = EventRegistration(
            public_id=build_event_registration_public_id(),
            post_id=item.id,
            first_name=values["first_name"],
            last_name=values["last_name"],
            email=values["email"],
            occupation=resolve_event_registration_occupation(values),
            diet_preference=values["diet_preference"],
            comment=values["comment"],
            status=determine_initial_registration_status(item),
        )

        db.session.add(registration)
        db.session.commit()

        flash("Your registration has been submitted.")
        return redirect(url_for("main.event_registration_status", public_id=registration.public_id))

    return render_template(
        "forms/event_registration.html",
        registration_summary=build_post_registration_summary(item),
        **get_event_registration_template_context(item, values, errors),
    )


@bp.route("/event-registrations/<public_id>")
def event_registration_status(public_id):
    item = EventRegistration.query.filter_by(public_id=public_id).first_or_404()
    post = Post.query.get_or_404(item.post_id)
    return render_template(
        "event_registration_status.html",
        item=item,
        post=post,
        registration_summary=build_post_registration_summary(post),
        status_context=build_event_registration_status_context(item),
    )

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

def render_calendar_page(mode="default"):
    calendar_mode = mode if mode in CALENDAR_MODES else "default"
    now_local = get_local_now()
    today = now_local.date()

    raw_month = request.args.get("month")
    if (raw_month or "").strip():
        year, month = parse_calendar_month(raw_month)
    else:
        year, month = now_local.year, now_local.month
    event_kind_filter = (request.args.get("kind") or "").strip()

    month_matrix = calendar.Calendar(firstweekday=0).monthdatescalendar(year, month)
    visible_start = month_matrix[0][0]
    visible_end = month_matrix[-1][-1]
    visible_start_at = datetime(visible_start.year, visible_start.month, visible_start.day)
    visible_end_at = datetime(visible_end.year, visible_end.month, visible_end.day, 23, 59, 59)

    items = (
        get_public_posts_query()
        .filter(Post.starts_at.isnot(None))
        .filter(Post.starts_at >= visible_start_at)
        .filter(Post.starts_at <= visible_end_at)
        .order_by(Post.starts_at.asc())
        .all()
    )
    items = [item for item in items if item.is_publicly_accessible]
    unfiltered_month_items = [
        item for item in items
        if item.starts_at.year == year and item.starts_at.month == month
    ]

    event_kind_counts = {}
    for item in unfiltered_month_items:
        if not item.event_kind:
            continue
        event_kind_counts[item.event_kind] = event_kind_counts.get(item.event_kind, 0) + 1

    valid_event_kinds = set(EVENT_KIND_ORDER) | set(event_kind_counts)
    if event_kind_filter not in valid_event_kinds:
        event_kind_filter = ""

    event_kind_options = [
        {"kind": kind, "count": count}
        for kind, count in event_kind_counts.items()
    ]
    if event_kind_filter and event_kind_filter not in event_kind_counts:
        event_kind_options.append({"kind": event_kind_filter, "count": 0})

    event_kind_options.sort(
        key=lambda option: (
            EVENT_KIND_ORDER.index(option["kind"])
            if option["kind"] in EVENT_KIND_ORDER
            else len(EVENT_KIND_ORDER),
            option["kind"],
        )
    )

    if event_kind_filter:
        items = [item for item in items if item.event_kind == event_kind_filter]

    month_items = [
        item for item in items
        if item.starts_at.year == year and item.starts_at.month == month
    ]
    upcoming_items = [item for item in month_items if now_local < item.ends_at]
    archived_items = [item for item in month_items if now_local >= item.ends_at]

    upcoming_items.sort(key=lambda item: item.starts_at)
    archived_items.sort(key=lambda item: item.ends_at, reverse=True)

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
    day_modal_groups = [
        {"date": day, "items": events_by_day.get(day, [])}
        for week in month_matrix
        for day in week
        if events_by_day.get(day)
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
        calendar_mode=calendar_mode,
        month_matrix=month_matrix,
        events_by_day=events_by_day,
        current_year=year,
        current_month=month,
        month_label=datetime(year, month, 1).strftime("%B %Y"),
        current_month_value=f"{year:04d}-{month:02d}",
        prev_month_value=f"{prev_year:04d}-{prev_month:02d}",
        next_month_value=f"{next_year:04d}-{next_month:02d}",
        today_month_value=f"{today.year:04d}-{today.month:02d}",
        event_kind_filter=event_kind_filter,
        event_kind_options=event_kind_options,
        event_kind_total_count=len(unfiltered_month_items),
        agenda_days=agenda_days,
        day_modal_groups=day_modal_groups,
        month_items=month_items,
        upcoming_items=upcoming_items,
        archived_items=archived_items,
        now_local=now_local,
        today=today,
    )

@bp.route("/calendar")
def calendar_view():
    return render_calendar_page(request.args.get("view", "default"))

@bp.route("/calendar-<mode>")
def calendar_mode(mode):
    if mode not in CALENDAR_MODES:
        abort(404)
    return render_calendar_page(mode)

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
    errors = {}

    if request.method == "POST":
        values["kind"] = request.form.get("kind", "").strip()
        values["country"] = request.form.get("country", "").strip()
        values["contact_name"] = request.form.get("contact_name", "").strip()
        values["contact_email"] = request.form.get("contact_email", "").strip()
        values["contact_phone"] = request.form.get("contact_phone", "").strip()
        values["comment"] = request.form.get("comment", "").strip()

        if values["kind"] not in {"country_evening", "breakfast"}:
            errors["kind"] = "Select a valid event type."

        if not values["country"]:
            errors["country"] = "Country is required."

        if not values["contact_name"]:
            errors["contact_name"] = "Contact name is required."

        if not values["contact_email"] and not values["contact_phone"]:
            errors["contact_email"] = "Enter email or phone."
            errors["contact_phone"] = "Enter email or phone."

        if errors:
            return render_template("forms/suggest_event.html", values=values, errors=errors)

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

    return render_template("forms/suggest_event.html", values=values, errors=errors)

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
    errors = {}

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

        if not values["first_name"]:
            errors["first_name"] = "First name is required."
        if not values["last_name"]:
            errors["last_name"] = "Last name is required."
        if not values["email"]:
            errors["email"] = "Email is required."

        if not values["occupation"]:
            errors["occupation"] = "Occupation is required."
        if not values["gender"]:
            errors["gender"] = "Gender is required."
        if not values["country_of_origin"]:
            errors["country_of_origin"] = "Country of origin is required."

        if values["occupation"] == "other" and not values["occupation_other"]:
            errors["occupation_other"] = "Enter occupation."

        if birth_year is None:
            errors["birth_year"] = "Enter a valid birth year."

        if departure_date is None:
            errors["departure_date"] = "Enter a valid departure date."

        if not values["offered_languages"]:
            errors["offered_languages"] = "Select at least one offered language."

        if not values["requested_languages"]:
            errors["requested_languages"] = "Select at least one requested language."

        if errors:
            return render_language_tandem_form_page(values, errors=errors)

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

    return render_language_tandem_form_page(values, errors=errors)
