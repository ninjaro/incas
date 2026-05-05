const ORANGE = "#ff6600";
const ORANGE_SOFT = "#fff0e6";
const NEUTRAL_BG = "#fffdfb";
const NEUTRAL_FILL = "#f4e7dc";
const NEUTRAL_STROKE = "#111827";

const OPENLAYERS_CSS_URL = "https://cdn.jsdelivr.net/npm/ol@10.7.0/ol.css";
const OPENLAYERS_JS_URL = "https://cdn.jsdelivr.net/npm/ol@10.7.0/dist/ol.js";
const WORLD_ATLAS_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const AMCHARTS_WORLD_GEODATA_URL = "https://cdn.amcharts.com/lib/5/geodata/worldLow.js";

const root = document.querySelector("[data-event-post-map]");
const dataElement = document.getElementById("event_post_map_json");

if (!root || !dataElement) {
    // This script is only used on event detail pages with map data.
} else {
    const mapConfig = JSON.parse(dataElement.textContent);
    const scriptPromises = new Map();
    const stylesheetPromises = new Map();

    function loadScriptOnce(src, readyCheck) {
        if (typeof readyCheck === "function" && readyCheck()) {
            return Promise.resolve();
        }

        if (scriptPromises.has(src)) {
            return scriptPromises.get(src);
        }

        const promise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.async = true;
            script.onload = () => {
                if (typeof readyCheck === "function" && !readyCheck()) {
                    reject(new Error(`Loaded ${src}, but the expected global was missing.`));
                    return;
                }
                resolve();
            };
            script.onerror = () => reject(new Error(`Failed to load ${src}.`));
            document.head.append(script);
        });

        scriptPromises.set(src, promise);
        return promise;
    }

    function loadStylesheetOnce(href) {
        if (stylesheetPromises.has(href)) {
            return stylesheetPromises.get(href);
        }

        const promise = new Promise((resolve, reject) => {
            const existing = document.querySelector(`link[href="${href}"]`);
            if (existing) {
                resolve();
                return;
            }

            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = href;
            link.onload = () => resolve();
            link.onerror = () => reject(new Error(`Failed to load stylesheet ${href}.`));
            document.head.append(link);
        });

        stylesheetPromises.set(href, promise);
        return promise;
    }

    function normalizeNumericCode(value) {
        const parsed = Number.parseInt(String(value || "").trim(), 10);
        return Number.isFinite(parsed) ? String(parsed) : "";
    }

    function computeDashPattern(lineLength) {
        const safeLength = Math.max(Number(lineLength) || 0, 1);
        const dashCount = Math.max(3, Math.floor(safeLength / 44));
        const gapRatio = 0.68;
        const dashLength = safeLength / (dashCount + Math.max(dashCount - 1, 0) * gapRatio);
        const gapLength = dashLength * gapRatio;
        const strokeWidth = dashLength < 12 ? 1.35 : dashLength < 18 ? 1.65 : 1.9;

        return {
            dashLength,
            gapLength,
            strokeWidth,
        };
    }

    function renderError(message) {
        root.innerHTML = `
            <div class="map-demo-fallback-card">
                <span class="badge text-bg-danger mb-2">Render issue</span>
                <h3 class="h6 mb-2">Map unavailable</h3>
                <p class="mb-0 text-body-secondary">${message}</p>
            </div>
        `;
    }

    async function fetchJson(url) {
        const response = await fetch(url, { mode: "cors" });
        if (!response.ok) {
            throw new Error(`Request failed with ${response.status} for ${url}`);
        }
        return response.json();
    }

    let worldAtlasTopologyPromise;
    function fetchWorldAtlasTopology() {
        if (worldAtlasTopologyPromise) {
            return worldAtlasTopologyPromise;
        }

        worldAtlasTopologyPromise = fetchJson(WORLD_ATLAS_URL);
        return worldAtlasTopologyPromise;
    }

    let openLayersPromise;
    function loadOpenLayers() {
        if (window.ol?.Map) {
            return Promise.resolve();
        }

        if (openLayersPromise) {
            return openLayersPromise;
        }

        openLayersPromise = loadStylesheetOnce(OPENLAYERS_CSS_URL).then(() =>
            loadScriptOnce(OPENLAYERS_JS_URL, () => Boolean(window.ol?.Map))
        );

        return openLayersPromise;
    }

    let amChartsBasePromise;
    function loadAmChartsBase() {
        if (window.am5 && window.am5map) {
            return Promise.resolve();
        }

        if (amChartsBasePromise) {
            return amChartsBasePromise;
        }

        amChartsBasePromise = loadScriptOnce(
            "https://cdn.amcharts.com/lib/5/index.js",
            () => Boolean(window.am5)
        ).then(() =>
            loadScriptOnce("https://cdn.amcharts.com/lib/5/map.js", () => Boolean(window.am5map))
        );

        return amChartsBasePromise;
    }

    let amChartsWorldPromise;
    function loadAmChartsWorldGeodata() {
        if (window.am5geodata_worldLow) {
            return Promise.resolve();
        }

        if (amChartsWorldPromise) {
            return amChartsWorldPromise;
        }

        amChartsWorldPromise = loadScriptOnce(
            AMCHARTS_WORLD_GEODATA_URL,
            () => Boolean(window.am5geodata_worldLow)
        );

        return amChartsWorldPromise;
    }

    async function renderOpenLayersTrip(target) {
        await Promise.all([loadOpenLayers(), fetchWorldAtlasTopology()]);
        const topology = await fetchWorldAtlasTopology();
        const ol = window.ol;

        root.innerHTML = "";
        root.classList.add("map-demo-openlayers-host");

        const center = ol.proj.fromLonLat(target.center || [6.07, 50.24]);
        const zoom = target.zoom || 4.2;

        const worldFeatures = new ol.format.TopoJSON().readFeatures(topology, {
            featureProjection: "EPSG:3857",
        });

        const regionLayer = new ol.layer.Vector({
            source: new ol.source.Vector({
                features: worldFeatures,
            }),
            style: new ol.style.Style({
                fill: new ol.style.Fill({
                    color: "rgba(244, 231, 220, 0.34)",
                }),
                stroke: new ol.style.Stroke({
                    color: NEUTRAL_STROKE,
                    width: 0.7,
                }),
            }),
        });

        const originCoordinate = ol.proj.fromLonLat(target.origin.coordinates);
        const destinationCoordinate = ol.proj.fromLonLat(target.destination.coordinates);

        const tripLine = new ol.Feature({
            geometry: new ol.geom.LineString([originCoordinate, destinationCoordinate]),
        });

        const markers = [
            new ol.Feature({
                geometry: new ol.geom.Point(originCoordinate),
                name: target.origin.name,
                role: "origin",
            }),
            new ol.Feature({
                geometry: new ol.geom.Point(destinationCoordinate),
                name: target.destination.name,
                role: "destination",
            }),
        ];

        const lineStyle = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: ORANGE,
                width: 2,
                lineDash: [12, 8],
                lineCap: "round",
            }),
        });

        const markerStyle = (feature) =>
            new ol.style.Style({
                image: new ol.style.Circle({
                    radius: feature.get("role") === "destination" ? 6 : 5,
                    fill: new ol.style.Fill({
                        color: feature.get("role") === "destination" ? ORANGE : NEUTRAL_STROKE,
                    }),
                    stroke: new ol.style.Stroke({
                        color: NEUTRAL_STROKE,
                        width: 1,
                    }),
                }),
                text: new ol.style.Text({
                    text: feature.get("name") || "",
                    offsetY: feature.get("role") === "destination" ? -15 : 15,
                    font: "12px sans-serif",
                    fill: new ol.style.Fill({ color: NEUTRAL_STROKE }),
                    backgroundFill: new ol.style.Fill({ color: "rgba(255,253,251,0.94)" }),
                    backgroundStroke: new ol.style.Stroke({
                        color: feature.get("role") === "destination" ? ORANGE : ORANGE_SOFT,
                        width: 1,
                    }),
                    padding: [2, 6, 2, 6],
                }),
            });

        const tripLayer = new ol.layer.Vector({
            source: new ol.source.Vector({
                features: [tripLine, ...markers],
            }),
            style(feature) {
                return feature.getGeometry()?.getType() === "LineString"
                    ? lineStyle
                    : markerStyle(feature);
            },
        });

        const map = new ol.Map({
            target: root,
            layers: [
                new ol.layer.Tile({
                    source: new ol.source.OSM(),
                }),
                regionLayer,
                tripLayer,
            ],
            view: new ol.View({
                center,
                zoom,
            }),
        });

        const updateDashPattern = () => {
            const originPixel = map.getPixelFromCoordinate(originCoordinate);
            const destinationPixel = map.getPixelFromCoordinate(destinationCoordinate);
            if (!originPixel || !destinationPixel) {
                return;
            }
            const pixelDistance = Math.hypot(destinationPixel[0] - originPixel[0], destinationPixel[1] - originPixel[1]);
            const pattern = computeDashPattern(pixelDistance);
            lineStyle.getStroke().setWidth(pattern.strokeWidth);
            lineStyle.getStroke().setLineDash([pattern.dashLength, pattern.gapLength]);
            tripLine.changed();
        };

        updateDashPattern();
        map.on("moveend", updateDashPattern);
        map.on("change:size", updateDashPattern);
    }

    async function renderAmChartsMap(target) {
        await loadAmChartsBase();
        await loadAmChartsWorldGeodata();

        root.innerHTML = "";

        const am5 = window.am5;
        const am5map = window.am5map;
        const chartRoot = am5.Root.new(root);
        const chart = chartRoot.container.children.push(
            am5map.MapChart.new(chartRoot, {
                panX: "translateX",
                panY: "translateY",
                wheelX: "zoom",
                wheelY: "zoom",
                projection: am5map.geoMercator(),
                homeGeoPoint: {
                    longitude: (target.center || [15.0, 30.0])[0],
                    latitude: (target.center || [15.0, 30.0])[1],
                },
                homeZoomLevel: target.zoom || 1.8,
            })
        );

        chart.set("zoomControl", am5map.ZoomControl.new(chartRoot, {}));

        const baseSeries = chart.series.push(
            am5map.MapPolygonSeries.new(chartRoot, {
                geoJSON: window.am5geodata_worldLow,
                exclude: ["AQ"],
            })
        );

        baseSeries.mapPolygons.template.setAll({
            fill: am5.color(0xf4e7dc),
            stroke: am5.color(0x111827),
            strokeWidth: 0.55,
            tooltipText: "{name}",
        });

        if (
            (target.kind === "country" || target.kind === "country_group")
            && Array.isArray(target.country_codes)
            && target.country_codes.length
        ) {
            const focusSeries = chart.series.push(
                am5map.MapPolygonSeries.new(chartRoot, {
                    geoJSON: window.am5geodata_worldLow,
                    include: target.country_codes.map((code) => String(code || "").toUpperCase()),
                })
            );

            focusSeries.mapPolygons.template.setAll({
                fill: am5.color(0xff6600),
                stroke: am5.color(0x111827),
                strokeWidth: 0.95,
                tooltipText: "{name}",
            });
        }

        if (target.kind === "marker" && target.marker) {
            const pointSeries = chart.series.push(am5map.MapPointSeries.new(chartRoot, {}));
            pointSeries.bullets.push((bulletRoot, _series, dataItem) => {
                const context = dataItem.dataContext || {};
                const container = am5.Container.new(bulletRoot, {});

                container.children.push(
                    am5.Circle.new(bulletRoot, {
                        radius: 6,
                        fill: am5.color(0xff6600),
                        stroke: am5.color(0x111827),
                        strokeWidth: 1,
                    })
                );

                container.children.push(
                    am5.Label.new(bulletRoot, {
                        text: context.name || "",
                        centerX: am5.percent(50),
                        x: 0,
                        dy: -18,
                        fill: am5.color(0x111827),
                        fontSize: 12,
                        background: am5.RoundedRectangle.new(bulletRoot, {
                            fill: am5.color(0xfffdfb),
                            fillOpacity: 0.94,
                            stroke: am5.color(0xff6600),
                            strokeOpacity: 0.35,
                            cornerRadiusBL: 8,
                            cornerRadiusBR: 8,
                            cornerRadiusTL: 8,
                            cornerRadiusTR: 8,
                        }),
                        paddingLeft: 6,
                        paddingRight: 6,
                        paddingTop: 2,
                        paddingBottom: 2,
                    })
                );

                return am5.Bullet.new(bulletRoot, {
                    sprite: container,
                });
            });

            pointSeries.data.setAll([
                {
                    name: target.marker.name,
                    longitude: target.marker.coordinates[0],
                    latitude: target.marker.coordinates[1],
                },
            ]);
        }

        setTimeout(() => {
            if (typeof chartRoot.isDisposed === "function" && chartRoot.isDisposed()) {
                return;
            }

            if (typeof chart.zoomToGeoPoint === "function") {
                chart.zoomToGeoPoint(
                    {
                        longitude: (target.center || [15.0, 30.0])[0],
                        latitude: (target.center || [15.0, 30.0])[1],
                    },
                    target.zoom || 1.8,
                    true
                );
            }
        }, 0);
    }

    async function renderMap() {
        try {
            if (mapConfig.provider_id === "openlayers" && mapConfig.target?.kind === "trip") {
                await renderOpenLayersTrip(mapConfig.target);
                return;
            }

            if (mapConfig.provider_id === "amcharts-maps") {
                await renderAmChartsMap(mapConfig.target || {});
                return;
            }

            renderError("No supported provider is configured for this event map.");
        } catch (error) {
            renderError(error?.message || "Unexpected map render failure.");
        }
    }

    renderMap();
}
