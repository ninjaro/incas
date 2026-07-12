# Event Map Delivery

## Decision

The React event maps keep two focused renderers:

- International Weekend uses OpenLayers 10.9.0, OpenStreetMap raster tiles, and world-atlas 2.0.2 TopoJSON.
- Country Evening, International Breakfast, and Opening Ceremony use amCharts 5.19.1 with amCharts geodata.

The exact library versions are installed from npm and locked in `package-lock.json`. Vite splits the renderers into lazy chunks, so pages without a map do not execute the map libraries. This follows OpenLayers' production recommendation to install the package rather than use its hosted development build and avoids runtime executable code from third-party CDNs.

OpenStreetMap viewport tiles are the only runtime map dependency loaded from another host. If a renderer fails, React shows a localized descriptive fallback; event details, registration, payment information, and navigation remain usable. The browser suite forces a renderer failure to verify this independently of a particular hosting provider.

## Licensing And Operations

- [OpenLayers](https://openlayers.org/) is distributed under the 2-clause BSD license.
- [world-atlas](https://www.npmjs.com/package/world-atlas) is ISC licensed and redistributes Natural Earth geometry as TopoJSON.
- [amCharts download and licensing notes](https://www.amcharts.com/download/) permit free use with the amCharts logo; removing that branding requires a commercial license. INCAS must leave the free branding visible unless it purchases a suitable license.
- [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/) requires visible attribution, normal browser caching/referrers, and prohibits bulk download or prefetch. The map uses OpenLayers' OSM attribution control and only loads the interactive viewport. A commercial or self-hosted tile provider should replace the community endpoint if traffic becomes substantial or an SLA is required.

## Upgrade Procedure

When changing a library version or geodata package:

1. Review its release and license notes.
2. Install an exact version and review the lockfile diff.
3. Run TypeScript, production/demo builds, browser map-failure, event-detail, CSP, and visual tests.
4. Confirm that the generated map chunks remain lazy, OSM attribution stays visible, and no prefetch/offline behavior was introduced.
