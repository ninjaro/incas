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
        "summary": "Direct single-country target with a clean ISO mapping and a regional Europe-context viewport.",
        "target": {
            "kind": "country",
            "label": "Poland",
            "country_name": "Poland",
            "country_codes": ["PL"],
            "react_numeric_codes": ["616"],
            "center": [18.8, 52.1],
            "view": {
                "zoom": 2.35,
            },
            "react_view": {
                "center": [18.8, 52.1],
                "zoom": 2.35,
            },
            "mapping_note": (
                "Single-country mapping using ISO 3166-1 alpha-2 code PL, centered on the country "
                "with a regional zoom so nearby countries remain visible."
            ),
        },
    },
    {
        "id": "international-breakfast-turkey",
        "title": "International Breakfast: Turkish cuisine",
        "summary": "Cuisine-focused title, but still cleanly representable as Turkey with surrounding countries kept in view.",
        "target": {
            "kind": "country",
            "label": "Turkey",
            "country_name": "Turkey",
            "country_codes": ["TR"],
            "react_numeric_codes": ["792"],
            "center": [35.1, 39.0],
            "view": {
                "zoom": 2.0,
            },
            "react_view": {
                "center": [35.1, 39.0],
                "zoom": 2.0,
            },
            "mapping_note": (
                "Cuisine term resolved to the country Turkey for the demo because the title names a nationally "
                "specific cuisine, using a regional zoom instead of a tight country fit."
            ),
        },
    },
    {
        "id": "international-weekend-luxembourg",
        "title": "International Weekend: Luxembourg City",
        "summary": "City-trip example with Aachen as the origin, Luxembourg City as the target, and a visual line between both points.",
        "target": {
            "kind": "trip",
            "label": "Aachen to Luxembourg City",
            "center": [6.07, 50.24],
            "view": {
                "zoom": 4.2,
            },
            "react_view": {
                "center": [6.07, 50.24],
                "zoom": 4.2,
            },
            "origin": {
                "name": "Aachen",
                "coordinates": [6.0839, 50.7753],
            },
            "destination": {
                "name": "Luxembourg City",
                "coordinates": [6.1319, 49.6116],
            },
            "mapping_note": (
                "Trip events should focus on the destination city and show travel context. "
                "This demo uses Aachen as the starting point, Luxembourg City as the target, "
                "and a regional viewport that includes both without highlighting the whole country."
            ),
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
            "center": [21.0, 25.0],
            "view": {
                "zoom": 1.55,
            },
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
        "description": "Lightweight region coloring on a world map. Useful for a quick comparison, but not a strong fit when zooming, panning, or city-to-city overlays matter.",
        "docs_url": "https://developers.google.com/chart/interactive/docs/gallery/geochart",
        "license_url": "https://developers.google.com/chart/terms",
        "usage_note": "Google Charts is free, but usage is governed by Google Charts and Google APIs terms. GeoChart can color countries, provinces, or states, but the official docs note that the chart is not scrollable or draggable.",
    },
    {
        "id": "highcharts-maps",
        "name": "Highcharts Maps",
        "runtime": "Highcharts + TopoJSON",
        "description": "World-context map with built-in zoom/navigation controls plus point and line overlays for trip-style demos.",
        "docs_url": "https://www.highcharts.com/docs/maps/getting-started",
        "license_url": "https://www.highcharts.com/products/maps/",
        "usage_note": "Highcharts Maps is a commercial product. The official product and installation pages frame it as licensed software with trial/evaluation use before production deployment.",
    },
    {
        "id": "amcharts-maps",
        "name": "amCharts Maps",
        "runtime": "amCharts 5 + geodata",
        "description": "World map with smooth zooming, bundled geodata, and support for point and line series in the same scene.",
        "docs_url": "https://www.amcharts.com/docs/v5/charts/map-chart/",
        "license_url": "https://www.amcharts.com/",
        "usage_note": "amCharts allows free use, including commercial use, with a small backlink. Removing branding requires a paid license.",
    },
    {
        "id": "react-simple-maps",
        "name": "react-simple-maps",
        "runtime": "React + SVG + TopoJSON",
        "description": "Lean React world-map rendering with direct control over SVG markers, dashed connector lines, and wheel/pan zoom behavior.",
        "docs_url": "https://www.react-simple-maps.io/docs/getting-started/",
        "license_url": "https://github.com/zcreativelabs/react-simple-maps",
        "usage_note": "react-simple-maps is MIT licensed, but it expects a React runtime plus separately sourced TopoJSON or GeoJSON files.",
    },
    {
        "id": "leaflet-osm",
        "name": "Leaflet + OSM",
        "runtime": "Leaflet + OSM tiles + GeoJSON",
        "description": "Tile-based map context with familiar slippy-map behavior, custom vector overlays, and a strong fit for city markers and short trip lines.",
        "docs_url": "https://leafletjs.com/examples/quick-start/",
        "license_url": "https://github.com/Leaflet/Leaflet/blob/main/LICENSE",
        "usage_note": "Leaflet itself is open source. The common OSM tile setup is easy for demos, but production use still needs attribution and should review the OpenStreetMap tile usage guidance mentioned in the official quick-start docs.",
    },
    {
        "id": "openlayers",
        "name": "OpenLayers",
        "runtime": "OpenLayers + OSM + TopoJSON",
        "description": "Full map-engine option with OSM tiles, native vector overlays, and broad format support including TopoJSON for country highlighting.",
        "docs_url": "https://openlayers.org/doc/quickstart.html",
        "license_url": "https://openlayers.org/doc/",
        "usage_note": "OpenLayers is BSD-2-Clause licensed per the official documentation. It is feature-rich and flexible, but heavier than Leaflet and more engine-like than a simple embed.",
    },
    {
        "id": "d3-geo",
        "name": "D3 Geo",
        "runtime": "D3 + SVG + TopoJSON",
        "description": "Low-level SVG rendering with custom zoom, projection control, and very direct styling of markers, paths, and highlighted regions.",
        "docs_url": "https://d3js.org/d3-geo",
        "license_url": "https://github.com/d3/d3/blob/main/LICENSE",
        "usage_note": "D3 is ISC licensed. It is not a ready-made map widget, but it gives the most direct control over projections, path styling, and custom interaction behavior.",
    },
]


def get_event_map_demo_context():
    return {
        "demo_events": MAP_DEMO_EVENTS,
        "demo_providers": MAP_DEMO_PROVIDERS,
        "demo_checked_on": "2026-05-01",
    }
