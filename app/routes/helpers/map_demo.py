ARABIC_SPEAKING_COUNTRY_CODES = [
    "DZ",
    "BH",
    "KM",
    "DJ",
    "EG",
    "IQ",
    "JO",
    "KW",
    "LB",
    "LY",
    "MR",
    "MA",
    "OM",
    "QA",
    "SA",
    "SO",
    "SD",
    "SY",
    "TN",
    "AE",
    "YE",
]

ARABIC_SPEAKING_NUMERIC_CODES = [
    "012",
    "048",
    "174",
    "262",
    "818",
    "368",
    "400",
    "414",
    "422",
    "434",
    "478",
    "504",
    "512",
    "634",
    "682",
    "706",
    "729",
    "760",
    "788",
    "784",
    "887",
]

MAP_DEMO_EVENTS = [
    {
        "id": "country-evening-poland",
        "title": "Country Evening: Poland",
        "summary": "Direct single-country target with a clean ISO mapping and an easy Europe-context zoom.",
        "target": {
            "kind": "country",
            "label": "Poland",
            "country_name": "Poland",
            "country_codes": ["PL"],
            "react_numeric_codes": ["616"],
            "react_view": {
                "center": [18.8, 52.1],
                "zoom": 3.1,
            },
            "mapping_note": "Single-country mapping using ISO 3166-1 alpha-2 code PL.",
        },
    },
    {
        "id": "international-breakfast-turkey",
        "title": "International Breakfast: Turkish cuisine",
        "summary": "Cuisine-focused title, but still cleanly representable as Turkey on a world-context map.",
        "target": {
            "kind": "country",
            "label": "Turkey",
            "country_name": "Turkey",
            "country_codes": ["TR"],
            "react_numeric_codes": ["792"],
            "react_view": {
                "center": [35.1, 39.0],
                "zoom": 2.45,
            },
            "mapping_note": "Cuisine term resolved to the country Turkey for the demo because the title names a nationally specific cuisine.",
        },
    },
    {
        "id": "international-weekend-luxembourg",
        "title": "International Weekend: Luxembourg",
        "summary": "A small-country stress test that shows how clearly each provider can locate Luxembourg within western Europe.",
        "target": {
            "kind": "country",
            "label": "Luxembourg",
            "country_name": "Luxembourg",
            "country_codes": ["LU"],
            "react_numeric_codes": ["442"],
            "react_view": {
                "center": [6.13, 49.82],
                "zoom": 5.1,
            },
            "mapping_note": "Single-country mapping using ISO 3166-1 alpha-2 code LU.",
        },
    },
    {
        "id": "international-breakfast-arab-culture",
        "title": "International Breakfast: Arab culture",
        "summary": "Broad cultural labels are only map-safe if they resolve to an explicit editorial country set instead of an implied single state.",
        "target": {
            "kind": "country_group",
            "label": "Arabic-speaking countries",
            "country_codes": ARABIC_SPEAKING_COUNTRY_CODES,
            "react_numeric_codes": ARABIC_SPEAKING_NUMERIC_CODES,
            "react_view": {
                "center": [21.0, 25.0],
                "zoom": 1.55,
            },
            "mapping_note": (
                "This demo treats 'Arab culture' as an explicit editorial grouping of Arabic-speaking countries. "
                "If production content cannot choose a specific region model like this, the label should be rejected "
                "instead of forcing a misleading country highlight."
            ),
        },
    },
]

MAP_DEMO_PROVIDERS = [
    {
        "id": "google-geochart",
        "name": "Google GeoChart",
        "runtime": "Google loader + SVG",
        "description": "Lightweight region coloring on a world map. Useful for a quick comparison, but not a strong fit when zooming and map navigation matter.",
        "docs_url": "https://developers.google.com/chart/interactive/docs/gallery/geochart",
        "license_url": "https://developers.google.com/chart/terms",
        "usage_note": "Google Charts is free, but usage is governed by Google Charts and Google APIs terms. GeoChart can color countries, provinces, or states, but the official docs note that the chart is not scrollable or draggable.",
    },
    {
        "id": "highcharts-maps",
        "name": "Highcharts Maps",
        "runtime": "Highcharts + TopoJSON",
        "description": "World-context choropleth with built-in zoom/navigation controls and a maintained map collection.",
        "docs_url": "https://www.highcharts.com/docs/maps/getting-started",
        "license_url": "https://www.highcharts.com/products/maps/",
        "usage_note": "Highcharts Maps is a commercial product. The official product and installation pages frame it as licensed software with trial/evaluation use before production deployment.",
    },
    {
        "id": "amcharts-maps",
        "name": "amCharts Maps",
        "runtime": "amCharts 5 + geodata",
        "description": "World map with smooth zooming, bundled geodata, and a generous free-with-branding path for prototypes.",
        "docs_url": "https://www.amcharts.com/docs/v5/charts/map-chart/",
        "license_url": "https://www.amcharts.com/",
        "usage_note": "amCharts allows free use, including commercial use, with a small backlink. Removing branding requires a paid license.",
    },
    {
        "id": "react-simple-maps",
        "name": "react-simple-maps",
        "runtime": "React + SVG + TopoJSON",
        "description": "Lean React world-map rendering with direct control over the SVG layer and wheel/pan zoom behavior.",
        "docs_url": "https://www.react-simple-maps.io/docs/getting-started/",
        "license_url": "https://github.com/zcreativelabs/react-simple-maps",
        "usage_note": "react-simple-maps is MIT licensed, but it expects a React runtime plus separately sourced TopoJSON or GeoJSON files.",
    },
]


def get_event_map_demo_context():
    return {
        "demo_events": MAP_DEMO_EVENTS,
        "demo_providers": MAP_DEMO_PROVIDERS,
        "demo_checked_on": "2026-05-01",
    }
