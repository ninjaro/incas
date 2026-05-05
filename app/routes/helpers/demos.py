from flask import url_for


def get_demo_links():
    return [
        {
            "label": "Demos",
            "url": url_for("main.demos_index"),
        },
        {
            "label": "Event Maps",
            "url": url_for("main.event_map_demo"),
            "summary": "Country, culture, and trip-map prototypes for event posts.",
        },
        {
            "label": "QR Scanner",
            "url": url_for("main.qr_scanner_demo"),
            "summary": "Camera and image-upload QR decoding prototype for admin workflows.",
        },
        {
            "label": "Bulletin Calendar",
            "url": url_for("main.calendar_mode", mode="bulletin"),
            "summary": "Alternative event calendar layout with compact month navigation and a stacked event bulletin.",
        },
    ]


def get_debug_nav_links():
    return get_demo_links()
