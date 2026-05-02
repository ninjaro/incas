const ORANGE = "#ff6600";
const ORANGE_SOFT = "#fff0e6";
const ORANGE_HOVER = "#ff8533";
const NEUTRAL_BG = "#fffdfb";
const NEUTRAL_FILL = "#f4e7dc";
const NEUTRAL_STROKE = "#111827";
const DEFAULT_CENTER = [15, 30];
const DEFAULT_ZOOM = 1.45;

const demoRoot = document.querySelector("[data-event-map-demo]");

if (!demoRoot) {
    // This script is page-specific and should do nothing elsewhere.
} else {
    const events = JSON.parse(document.getElementById("map_demo_events_json").textContent);
    const providerMeta = JSON.parse(document.getElementById("map_demo_providers_json").textContent);
    const eventButtons = Array.from(document.querySelectorAll("[data-map-demo-event]"));
    const providerButtons = Array.from(document.querySelectorAll("[data-map-demo-provider]"));
    const providerCanvases = new Map(
        Array.from(document.querySelectorAll("[data-map-demo-canvas]")).map((element) => [
            element.dataset.mapDemoCanvas,
            element,
        ])
    );
    const summaryElement = document.getElementById("map-demo-event-summary");

    const providerInstances = new Map();
    const renderTokens = new Map();

    const state = {
        eventId: events[0]?.id || null,
        providerId: providerMeta[0]?.id || null,
    };

    const providerById = new Map(providerMeta.map((item) => [item.id, item]));
    const eventById = new Map(events.map((item) => [item.id, item]));

    const REACT_WORLD_ATLAS_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
    const HIGHCHARTS_WORLD_MAP_URL = "https://code.highcharts.com/mapdata/custom/world.topo.json";
    const AMCHARTS_WORLD_GEODATA_URL = "https://cdn.amcharts.com/lib/5/geodata/worldLow.js";

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function normalizeAlpha2(code) {
        return String(code || "").trim().toLowerCase();
    }

    function normalizeNumericCode(value) {
        const parsed = Number.parseInt(String(value || "").trim(), 10);
        return Number.isFinite(parsed) ? String(parsed) : "";
    }

    function getHighlightAlpha2Set(target) {
        return new Set((target.country_codes || []).map(normalizeAlpha2).filter(Boolean));
    }

    function getHighlightNumericSet(target) {
        return new Set((target.react_numeric_codes || []).map(normalizeNumericCode).filter(Boolean));
    }

    function getMapCenter(target) {
        const center = target?.view?.center || target?.center || target?.react_view?.center;
        return Array.isArray(center) && center.length === 2 ? center : DEFAULT_CENTER;
    }

    function getMapZoom(target) {
        return target?.view?.zoom || target?.react_view?.zoom || DEFAULT_ZOOM;
    }

    function hasTripRoute(target) {
        return Boolean(
            target?.kind === "trip" &&
            Array.isArray(target.origin?.coordinates) &&
            Array.isArray(target.destination?.coordinates)
        );
    }

    function getTripRoute(target) {
        if (!hasTripRoute(target)) {
            return null;
        }

        return {
            origin: target.origin,
            destination: target.destination,
        };
    }

    function computeDashPattern(lineLength) {
        const safeLength = Math.max(Number(lineLength) || 0, 1);
        const dashCount = Math.max(3, Math.floor(safeLength / 44));
        const gapRatio = 0.68;
        const dashLength = safeLength / (dashCount + Math.max(dashCount - 1, 0) * gapRatio);
        const gapLength = dashLength * gapRatio;
        const strokeWidth = dashLength < 12 ? 1.35 : dashLength < 18 ? 1.65 : 1.9;

        return {
            dashCount,
            dashLength,
            gapLength,
            strokeWidth,
            dashArray: `${dashLength.toFixed(2)} ${gapLength.toFixed(2)}`,
        };
    }

    function getActiveEvent() {
        return eventById.get(state.eventId) || events[0];
    }

    function setEventButtonState(activeId) {
        eventButtons.forEach((button) => {
            const isActive = button.dataset.mapDemoEvent === activeId;
            button.classList.toggle("active", isActive);
            button.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
    }

    function renderEventSummary(eventItem) {
        const target = eventItem.target || {};
        const title = escapeHtml(eventItem.title);
        const summary = escapeHtml(eventItem.summary || "");
        const mappingNote = escapeHtml(target.mapping_note || "");

        if (target.kind === "trip") {
            summaryElement.innerHTML = `
                <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
                    <span class="badge text-bg-dark">City trip target</span>
                    <span class="badge text-bg-light">${escapeHtml(target.destination?.name || target.label || "Destination")}</span>
                </div>
                <h2 class="h4 mb-2">${title}</h2>
                <p class="mb-3">${summary}</p>
                <dl class="map-demo-detail-list mb-0">
                    <div>
                        <dt>Origin</dt>
                        <dd>${escapeHtml(target.origin?.name || "Unknown")}</dd>
                    </div>
                    <div>
                        <dt>Destination</dt>
                        <dd>${escapeHtml(target.destination?.name || "Unknown")}</dd>
                    </div>
                    <div>
                        <dt>Mapping policy</dt>
                        <dd>${mappingNote}</dd>
                    </div>
                </dl>
            `;
            return;
        }

        if (target.kind === "country") {
            summaryElement.innerHTML = `
                <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
                    <span class="badge text-bg-primary">Country target</span>
                    <span class="badge text-bg-light">${escapeHtml(target.country_name)}</span>
                </div>
                <h2 class="h4 mb-2">${title}</h2>
                <p class="mb-3">${summary}</p>
                <dl class="map-demo-detail-list mb-0">
                    <div>
                        <dt>Country</dt>
                        <dd>${escapeHtml(target.country_name)}</dd>
                    </div>
                    <div>
                        <dt>ISO codes</dt>
                        <dd>${escapeHtml((target.country_codes || []).join(", "))}</dd>
                    </div>
                    <div>
                        <dt>Mapping policy</dt>
                        <dd>${mappingNote}</dd>
                    </div>
                </dl>
            `;
            return;
        }

        if (target.kind === "country_group") {
            summaryElement.innerHTML = `
                <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
                    <span class="badge text-bg-dark">Region target</span>
                    <span class="badge text-bg-light">${escapeHtml(target.label || "Country group")}</span>
                </div>
                <h2 class="h4 mb-2">${title}</h2>
                <p class="mb-3">${summary}</p>
                <dl class="map-demo-detail-list mb-0">
                    <div>
                        <dt>Editorial region</dt>
                        <dd>${escapeHtml(target.label || "Country group")}</dd>
                    </div>
                    <div>
                        <dt>Mapped countries</dt>
                        <dd>${escapeHtml(String((target.country_codes || []).length))}</dd>
                    </div>
                    <div>
                        <dt>Mapping policy</dt>
                        <dd>${mappingNote}</dd>
                    </div>
                </dl>
            `;
            return;
        }

        summaryElement.innerHTML = `
            <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
                <span class="badge text-bg-secondary">Rejected mapping</span>
            </div>
            <h2 class="h4 mb-2">${title}</h2>
            <p class="mb-3">${summary}</p>
            <div class="map-demo-fallback-note">
                <strong class="d-block mb-1">Why the fallback matters</strong>
                <span>${escapeHtml(target.mapping_note || "No clean region model is available for this label.")}</span>
            </div>
        `;
    }

    function createRenderToken(providerId) {
        const token = Symbol(providerId);
        renderTokens.set(providerId, token);
        return token;
    }

    function isCurrentToken(providerId, token) {
        return renderTokens.get(providerId) === token;
    }

    function disposeProviderInstance(providerId) {
        const instance = providerInstances.get(providerId);
        if (instance && typeof instance.dispose === "function") {
            instance.dispose();
        }
        providerInstances.delete(providerId);
    }

    function clearCanvas(providerId) {
        const canvas = providerCanvases.get(providerId);
        if (!canvas) {
            return null;
        }
        disposeProviderInstance(providerId);
        canvas.innerHTML = "";
        return canvas;
    }

    function renderLoading(providerId, label) {
        const canvas = clearCanvas(providerId);
        if (!canvas) {
            return null;
        }

        canvas.innerHTML = `
            <div class="map-demo-placeholder">
                <div class="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true"></div>
                <span>${escapeHtml(label)}</span>
            </div>
        `;
        return canvas;
    }

    function renderFallback(providerId, label, reason) {
        const canvas = clearCanvas(providerId);
        if (!canvas) {
            return;
        }

        canvas.innerHTML = `
            <div class="map-demo-fallback-card">
                <span class="badge text-bg-secondary mb-2">${escapeHtml(label)}</span>
                <h3 class="h6 mb-2">No forced geography</h3>
                <p class="mb-0 text-body-secondary">${escapeHtml(reason)}</p>
            </div>
        `;
    }

    function renderError(providerId, label, error) {
        const canvas = clearCanvas(providerId);
        if (!canvas) {
            return;
        }

        canvas.innerHTML = `
            <div class="map-demo-fallback-card">
                <span class="badge text-bg-danger mb-2">Render issue</span>
                <h3 class="h6 mb-2">${escapeHtml(label)}</h3>
                <p class="mb-0 text-body-secondary">${escapeHtml(error)}</p>
            </div>
        `;
    }

    function buildChartHost(providerId) {
        const canvas = clearCanvas(providerId);
        if (!canvas) {
            return null;
        }

        const host = document.createElement("div");
        host.className = "map-demo-chart-host";
        canvas.append(host);
        return host;
    }

    function appendProviderNote(providerId, message) {
        const canvas = providerCanvases.get(providerId);
        if (!canvas || !message) {
            return;
        }

        const note = document.createElement("div");
        note.className = "map-demo-provider-note";
        note.textContent = message;
        canvas.append(note);
    }

    const scriptPromises = new Map();

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

    let googleGeoChartPromise;
    function loadGoogleGeoChart() {
        if (window.google?.visualization?.GeoChart) {
            return Promise.resolve();
        }

        if (googleGeoChartPromise) {
            return googleGeoChartPromise;
        }

        googleGeoChartPromise = loadScriptOnce(
            "https://www.gstatic.com/charts/loader.js",
            () => Boolean(window.google?.charts?.load)
        ).then(
            () =>
                new Promise((resolve) => {
                    window.google.charts.load("current", { packages: ["geochart"] });
                    window.google.charts.setOnLoadCallback(resolve);
                })
        );

        return googleGeoChartPromise;
    }

    let highchartsPromise;
    function loadHighchartsMaps() {
        if (window.Highcharts?.mapChart) {
            return Promise.resolve();
        }

        if (highchartsPromise) {
            return highchartsPromise;
        }

        highchartsPromise = loadScriptOnce(
            "https://code.highcharts.com/maps/highmaps.js",
            () => Boolean(window.Highcharts?.mapChart)
        );

        return highchartsPromise;
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

    let reactModulesPromise;
    function loadReactModules() {
        if (reactModulesPromise) {
            return reactModulesPromise;
        }

        reactModulesPromise = Promise.all([
            import("react"),
            import("react-dom/client"),
            import("react-simple-maps"),
        ]).then(([reactModule, reactDomClientModule, reactSimpleMapsModule]) => ({
            React: reactModule.default || reactModule,
            ReactDOMClient: reactDomClientModule,
            ReactSimpleMaps: reactSimpleMapsModule,
        }));

        return reactModulesPromise;
    }

    async function fetchJson(url) {
        const response = await fetch(url, { mode: "cors" });
        if (!response.ok) {
            throw new Error(`Request failed with ${response.status} for ${url}`);
        }
        return response.json();
    }

    function getHighchartsAreaKey(area) {
        const properties = area?.properties || {};
        return normalizeAlpha2(
            properties["hc-key"] ||
            properties["iso-a2"] ||
            properties.iso2 ||
            properties.code
        );
    }

    function applyHighchartsTripLineStyle(chart) {
        const tripSeries = chart.series.find((item) => item.type === "mapline");
        const lineElement = tripSeries?.points?.[0]?.graphic?.element;
        if (!lineElement || typeof lineElement.getTotalLength !== "function") {
            return;
        }

        const pattern = computeDashPattern(lineElement.getTotalLength());
        lineElement.setAttribute("stroke", ORANGE);
        lineElement.setAttribute("stroke-width", pattern.strokeWidth.toFixed(2));
        lineElement.setAttribute("stroke-dasharray", pattern.dashArray);
        lineElement.setAttribute("stroke-linecap", "round");
    }

    async function renderGoogleProvider(eventItem, providerId, token) {
        const target = eventItem.target || {};
        const highlightCodes = Array.from(getHighlightAlpha2Set(target)).map((code) => code.toUpperCase());
        const tripRoute = getTripRoute(target);

        if (!highlightCodes.length && !tripRoute) {
            renderFallback(providerId, "Rejected mapping", target.mapping_note || "No explicit country list is available.");
            return;
        }

        renderLoading(providerId, "Loading Google GeoChart…");
        await loadGoogleGeoChart();
        if (!isCurrentToken(providerId, token)) {
            return;
        }

        const host = buildChartHost(providerId);
        if (!host) {
            return;
        }

        let data;
        let options;

        if (tripRoute) {
            const [originLon, originLat] = tripRoute.origin.coordinates;
            const [destinationLon, destinationLat] = tripRoute.destination.coordinates;
            data = window.google.visualization.arrayToDataTable([
                ["Latitude", "Longitude", "Role", "Weight"],
                [originLat, originLon, tripRoute.origin.name, 0],
                [destinationLat, destinationLon, tripRoute.destination.name, 1],
            ]);
            options = {
                region: "150",
                displayMode: "markers",
                legend: "none",
                backgroundColor: "transparent",
                datalessRegionColor: NEUTRAL_FILL,
                colorAxis: { minValue: 0, maxValue: 1, colors: [NEUTRAL_STROKE, ORANGE] },
                sizeAxis: { minValue: 0, maxValue: 1, minSize: 8, maxSize: 10 },
                keepAspectRatio: true,
            };
        } else {
            const rows = [["Country", "Focus"], ...highlightCodes.map((code) => [code, 1])];
            data = window.google.visualization.arrayToDataTable(rows);
            options = {
                region: "world",
                resolution: "countries",
                displayMode: "regions",
                legend: "none",
                backgroundColor: "transparent",
                datalessRegionColor: NEUTRAL_FILL,
                defaultColor: NEUTRAL_FILL,
                colorAxis: { minValue: 1, maxValue: 1, colors: [ORANGE, ORANGE] },
                tooltip: { textStyle: { color: NEUTRAL_STROKE } },
                keepAspectRatio: true,
            };
        }

        const chart = new window.google.visualization.GeoChart(host);
        const resizeObserver = typeof ResizeObserver === "function"
            ? new ResizeObserver(() => chart.draw(data, options))
            : null;

        chart.draw(data, options);
        resizeObserver?.observe(host);

        if (tripRoute) {
            appendProviderNote(
                providerId,
                "GeoChart can show the two trip markers, but it does not support free pan/zoom or a dashed connector overlay in the same map scene."
            );
        } else {
            appendProviderNote(
                providerId,
                "GeoChart keeps the comparison lightweight, but it remains a static map with no manual pan/zoom."
            );
        }

        providerInstances.set(providerId, {
            dispose() {
                resizeObserver?.disconnect();
                host.innerHTML = "";
            },
        });
    }

    async function renderHighchartsProvider(eventItem, providerId, token) {
        const target = eventItem.target || {};
        const tripRoute = getTripRoute(target);
        const highlightSet = tripRoute ? new Set() : getHighlightAlpha2Set(target);

        if (!highlightSet.size && !tripRoute) {
            renderFallback(providerId, "Rejected mapping", target.mapping_note || "No explicit country list is available.");
            return;
        }

        renderLoading(providerId, "Loading Highcharts Maps…");
        await loadHighchartsMaps();
        if (!isCurrentToken(providerId, token)) {
            return;
        }

        const mapData = await fetchJson(HIGHCHARTS_WORLD_MAP_URL);
        if (!isCurrentToken(providerId, token)) {
            return;
        }

        const host = buildChartHost(providerId);
        if (!host) {
            return;
        }

        const areas = window.Highcharts.geojson(mapData);
        const choroplethData = areas
            .map((area) => {
                const key = getHighchartsAreaKey(area);
                const hcKey = area?.properties?.["hc-key"];
                if (!hcKey) {
                    return null;
                }
                return {
                    "hc-key": hcKey,
                    value: highlightSet.has(key) ? 1 : null,
                };
            })
            .filter(Boolean);

        const series = [
            {
                mapData,
                data: choroplethData,
                joinBy: "hc-key",
                borderColor: NEUTRAL_STROKE,
                borderWidth: 0.55,
                nullColor: NEUTRAL_FILL,
                states: {
                    hover: {
                        color: ORANGE_HOVER,
                    },
                },
                dataLabels: {
                    enabled: false,
                },
            },
        ];

        if (tripRoute) {
            series.push(
                {
                    type: "mapline",
                    name: "Trip context",
                    data: [
                        {
                            name: `${tripRoute.origin.name} to ${tripRoute.destination.name}`,
                            geometry: {
                                type: "LineString",
                                coordinates: [
                                    tripRoute.origin.coordinates,
                                    tripRoute.destination.coordinates,
                                ],
                            },
                        },
                    ],
                    color: ORANGE,
                    lineWidth: 2,
                    dashStyle: "Dash",
                    enableMouseTracking: false,
                },
                {
                    type: "mappoint",
                    name: "Trip markers",
                    dataLabels: {
                        enabled: true,
                        format: "{point.name}",
                        style: {
                            color: NEUTRAL_STROKE,
                            fontSize: "11px",
                            textOutline: "none",
                        },
                        y: -10,
                    },
                    marker: {
                        radius: 5,
                        lineColor: NEUTRAL_STROKE,
                        lineWidth: 1,
                    },
                    data: [
                        {
                            name: tripRoute.origin.name,
                            lon: tripRoute.origin.coordinates[0],
                            lat: tripRoute.origin.coordinates[1],
                            color: NEUTRAL_STROKE,
                        },
                        {
                            name: tripRoute.destination.name,
                            lon: tripRoute.destination.coordinates[0],
                            lat: tripRoute.destination.coordinates[1],
                            color: ORANGE,
                        },
                    ],
                }
            );
        }

        const chart = window.Highcharts.mapChart(host, {
            chart: {
                map: mapData,
                backgroundColor: "transparent",
                spacing: [8, 8, 8, 8],
            },
            title: { text: null },
            legend: { enabled: false },
            mapNavigation: {
                enabled: true,
                enableMouseWheelZoom: true,
                buttonOptions: {
                    verticalAlign: "bottom",
                },
            },
            mapView: {
                center: getMapCenter(target),
                zoom: getMapZoom(target),
            },
            colorAxis: {
                min: 0,
                minColor: ORANGE_SOFT,
                maxColor: ORANGE,
            },
            tooltip: {
                pointFormatter() {
                    return this.value ? "Highlighted target" : this.name || "Context";
                },
            },
            series,
        });

        let removeRenderHandler = null;
        if (tripRoute) {
            removeRenderHandler = window.Highcharts.addEvent(chart, "render", () => {
                applyHighchartsTripLineStyle(chart);
            });
            applyHighchartsTripLineStyle(chart);
        }

        providerInstances.set(providerId, {
            dispose() {
                removeRenderHandler?.();
                chart.destroy();
            },
        });
    }

    async function renderAmChartsProvider(eventItem, providerId, token) {
        const target = eventItem.target || {};
        const tripRoute = getTripRoute(target);
        const highlightCodes = tripRoute
            ? []
            : Array.from(getHighlightAlpha2Set(target)).map((code) => code.toUpperCase());

        if (!highlightCodes.length && !tripRoute) {
            renderFallback(providerId, "Rejected mapping", target.mapping_note || "No explicit country list is available.");
            return;
        }

        renderLoading(providerId, "Loading amCharts Maps…");
        await loadAmChartsBase();
        await loadAmChartsWorldGeodata();
        if (!isCurrentToken(providerId, token)) {
            return;
        }

        const host = buildChartHost(providerId);
        if (!host) {
            return;
        }

        const root = window.am5.Root.new(host);
        const chart = root.container.children.push(
            window.am5map.MapChart.new(root, {
                panX: "translateX",
                panY: "translateY",
                wheelX: "zoom",
                wheelY: "zoom",
                projection: window.am5map.geoMercator(),
                homeGeoPoint: {
                    longitude: getMapCenter(target)[0],
                    latitude: getMapCenter(target)[1],
                },
                homeZoomLevel: getMapZoom(target),
            })
        );

        chart.set("zoomControl", window.am5map.ZoomControl.new(root, {}));

        const baseSeries = chart.series.push(
            window.am5map.MapPolygonSeries.new(root, {
                geoJSON: window.am5geodata_worldLow,
                exclude: ["AQ"],
            })
        );

        baseSeries.mapPolygons.template.setAll({
            fill: window.am5.color(0xf4e7dc),
            stroke: window.am5.color(0x111827),
            strokeWidth: 0.5,
            tooltipText: "{name}",
        });

        if (highlightCodes.length) {
            const focusSeries = chart.series.push(
                window.am5map.MapPolygonSeries.new(root, {
                    geoJSON: window.am5geodata_worldLow,
                    include: highlightCodes,
                })
            );

            focusSeries.mapPolygons.template.setAll({
                fill: window.am5.color(0xff6600),
                stroke: window.am5.color(0x111827),
                strokeWidth: 0.9,
                tooltipText: "{name}",
            });
        }

        if (tripRoute) {
            const lineSeries = chart.series.push(window.am5map.MapLineSeries.new(root, {}));
            lineSeries.mapLines.template.setAll({
                stroke: window.am5.color(0xff6600),
                tooltipText: "{name}",
            });
            lineSeries.data.setAll([
                {
                    name: `${tripRoute.origin.name} to ${tripRoute.destination.name}`,
                    geometry: {
                        type: "LineString",
                        coordinates: [
                            tripRoute.origin.coordinates,
                            tripRoute.destination.coordinates,
                        ],
                    },
                },
            ]);

            const pointSeries = chart.series.push(window.am5map.MapPointSeries.new(root, {}));
            pointSeries.bullets.push((bulletRoot, _series, dataItem) => {
                const context = dataItem.dataContext || {};
                const isDestination = context.role === "destination";
                const color = isDestination ? 0xff6600 : 0x111827;
                const container = window.am5.Container.new(bulletRoot, {});

                container.children.push(
                    window.am5.Circle.new(bulletRoot, {
                        radius: isDestination ? 6 : 5,
                        fill: window.am5.color(color),
                        stroke: window.am5.color(0x111827),
                        strokeWidth: 1,
                    })
                );

                container.children.push(
                    window.am5.Label.new(bulletRoot, {
                        text: context.name || "",
                        centerX: window.am5.percent(50),
                        x: 0,
                        dy: isDestination ? -18 : 14,
                        fill: window.am5.color(0x111827),
                        fontSize: 12,
                        background: window.am5.RoundedRectangle.new(bulletRoot, {
                            fill: window.am5.color(0xfffdfb),
                            fillOpacity: 0.92,
                            stroke: window.am5.color(0xff6600),
                            strokeOpacity: isDestination ? 0.4 : 0.2,
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

                return window.am5.Bullet.new(bulletRoot, {
                    sprite: container,
                });
            });
            pointSeries.data.setAll([
                {
                    name: tripRoute.origin.name,
                    role: "origin",
                    longitude: tripRoute.origin.coordinates[0],
                    latitude: tripRoute.origin.coordinates[1],
                },
                {
                    name: tripRoute.destination.name,
                    role: "destination",
                    longitude: tripRoute.destination.coordinates[0],
                    latitude: tripRoute.destination.coordinates[1],
                },
            ]);

            const applyAmChartsTripLineStyle = () => {
                const originPoint = chart.convert({
                    longitude: tripRoute.origin.coordinates[0],
                    latitude: tripRoute.origin.coordinates[1],
                });
                const destinationPoint = chart.convert({
                    longitude: tripRoute.destination.coordinates[0],
                    latitude: tripRoute.destination.coordinates[1],
                });
                if (!originPoint || !destinationPoint) {
                    return;
                }

                const pattern = computeDashPattern(
                    Math.hypot(destinationPoint.x - originPoint.x, destinationPoint.y - originPoint.y)
                );
                lineSeries.mapLines.template.setAll({
                    stroke: window.am5.color(0xff6600),
                    strokeWidth: pattern.strokeWidth,
                    strokeDasharray: [pattern.dashLength, pattern.gapLength],
                });
                if (typeof lineSeries.mapLines?.each === "function") {
                    lineSeries.mapLines.each((line) => {
                        line.setAll({
                            stroke: window.am5.color(0xff6600),
                            strokeWidth: pattern.strokeWidth,
                            strokeDasharray: [pattern.dashLength, pattern.gapLength],
                        });
                    });
                }
            };

            setTimeout(() => {
                if (typeof root.isDisposed === "function" && root.isDisposed()) {
                    return;
                }
                applyAmChartsTripLineStyle();
            }, 0);
        }

        setTimeout(() => {
            if (typeof root.isDisposed === "function" && root.isDisposed()) {
                return;
            }

            if (typeof chart.zoomToGeoPoint === "function") {
                chart.zoomToGeoPoint(
                    {
                        longitude: getMapCenter(target)[0],
                        latitude: getMapCenter(target)[1],
                    },
                    getMapZoom(target),
                    true
                );
            } else if (typeof chart.goHome === "function") {
                chart.goHome();
            }
        }, 0);

        providerInstances.set(providerId, {
            dispose() {
                root.dispose();
            },
        });
    }

    async function renderReactProvider(eventItem, providerId, token) {
        const target = eventItem.target || {};
        const tripRoute = getTripRoute(target);
        const highlightNumericSet = tripRoute ? new Set() : getHighlightNumericSet(target);

        if (!highlightNumericSet.size && !tripRoute) {
            renderFallback(providerId, "Rejected mapping", target.mapping_note || "No explicit country list is available.");
            return;
        }

        renderLoading(providerId, "Loading react-simple-maps…");
        const modules = await loadReactModules();
        if (!isCurrentToken(providerId, token)) {
            return;
        }

        const canvas = clearCanvas(providerId);
        if (!canvas) {
            return;
        }

        const { React, ReactDOMClient, ReactSimpleMaps } = modules;
        const {
            ComposableMap,
            Geographies,
            Geography,
            Line,
            Marker,
            Sphere,
            ZoomableGroup,
        } = ReactSimpleMaps;
        const h = React.createElement;

        function TripMarker({ point, isDestination }) {
            return h(
                Marker,
                { coordinates: point.coordinates },
                h("circle", {
                    r: isDestination ? 6 : 5,
                    fill: isDestination ? ORANGE : NEUTRAL_STROKE,
                    stroke: NEUTRAL_STROKE,
                    strokeWidth: 1,
                }),
                h("text", {
                    y: isDestination ? -12 : 18,
                    textAnchor: "middle",
                    fontSize: 12,
                    fill: NEUTRAL_STROKE,
                }, point.name)
            );
        }

        function MapDemoReactChart({ targetConfig }) {
            const initialPosition = {
                coordinates: getMapCenter(targetConfig),
                zoom: getMapZoom(targetConfig),
            };
            const [position, setPosition] = React.useState(initialPosition);
            const shellRef = React.useRef(null);

            React.useEffect(() => {
                setPosition(initialPosition);
            }, [targetConfig]);

            const currentTripRoute = getTripRoute(targetConfig);

            React.useEffect(() => {
                if (!currentTripRoute || !shellRef.current) {
                    return;
                }

                const path = shellRef.current.querySelector(".map-demo-react-trip-line");
                if (!path || typeof path.getTotalLength !== "function") {
                    return;
                }

                const visibleLength = path.getTotalLength() * position.zoom;
                const pattern = computeDashPattern(visibleLength);
                path.setAttribute("stroke-dasharray", `${(pattern.dashLength / position.zoom).toFixed(2)} ${(pattern.gapLength / position.zoom).toFixed(2)}`);
                path.setAttribute("stroke-width", (pattern.strokeWidth / position.zoom).toFixed(2));
                path.setAttribute("stroke-linecap", "round");
            }, [currentTripRoute, position.zoom]);

            return h(
                "div",
                { className: "map-demo-react-shell", ref: shellRef },
                h(
                    "div",
                    { className: "map-demo-react-controls btn-group btn-group-sm", role: "group", "aria-label": "Map zoom controls" },
                    h(
                        "button",
                        {
                            type: "button",
                            className: "btn btn-outline-secondary",
                            onClick: () => setPosition((current) => ({
                                ...current,
                                zoom: Math.min(current.zoom * 1.25, 8),
                            })),
                        },
                        "+"
                    ),
                    h(
                        "button",
                        {
                            type: "button",
                            className: "btn btn-outline-secondary",
                            onClick: () => setPosition((current) => ({
                                ...current,
                                zoom: Math.max(current.zoom / 1.25, 1),
                            })),
                        },
                        "-"
                    ),
                    h(
                        "button",
                        {
                            type: "button",
                            className: "btn btn-outline-secondary",
                            onClick: () => setPosition(initialPosition),
                        },
                        "Reset"
                    )
                ),
                h(
                    ComposableMap,
                    {
                        projection: "geoMercator",
                        width: 800,
                        height: 420,
                        style: { width: "100%", height: "100%" },
                    },
                    h(Sphere, { fill: NEUTRAL_BG, stroke: ORANGE_SOFT, strokeWidth: 0.6 }),
                    h(
                        ZoomableGroup,
                        {
                            center: position.coordinates,
                            zoom: position.zoom,
                            minZoom: 1,
                            maxZoom: 8,
                            onMoveEnd: ({ coordinates, zoom }) => {
                                setPosition({ coordinates, zoom });
                            },
                        },
                        h(Geographies, { geography: REACT_WORLD_ATLAS_URL }, ({ geographies }) =>
                            geographies.map((geo) => {
                                const geoCode = normalizeNumericCode(geo.id);
                                const isTarget = highlightNumericSet.has(geoCode);
                                return h(Geography, {
                                    key: geo.rsmKey,
                                    geography: geo,
                                    fill: isTarget ? ORANGE : NEUTRAL_FILL,
                                    stroke: NEUTRAL_STROKE,
                                    strokeWidth: 0.45,
                                    style: {
                                        default: { outline: "none" },
                                        hover: {
                                            outline: "none",
                                            fill: isTarget ? ORANGE_HOVER : NEUTRAL_FILL,
                                        },
                                        pressed: { outline: "none" },
                                    },
                                });
                            })
                        ),
                        currentTripRoute && h(Line, {
                            className: "map-demo-react-trip-line",
                            from: currentTripRoute.origin.coordinates,
                            to: currentTripRoute.destination.coordinates,
                            stroke: ORANGE,
                            strokeWidth: 1.9,
                        }),
                        currentTripRoute && h(TripMarker, {
                            point: currentTripRoute.origin,
                            isDestination: false,
                        }),
                        currentTripRoute && h(TripMarker, {
                            point: currentTripRoute.destination,
                            isDestination: true,
                        })
                    )
                )
            );
        }

        const root = ReactDOMClient.createRoot(canvas);
        root.render(h(MapDemoReactChart, { targetConfig: target }));

        providerInstances.set(providerId, {
            dispose() {
                root.unmount();
            },
        });
    }

    const providerRenderers = {
        "google-geochart": renderGoogleProvider,
        "highcharts-maps": renderHighchartsProvider,
        "amcharts-maps": renderAmChartsProvider,
        "react-simple-maps": renderReactProvider,
    };

    async function renderActiveProvider() {
        const providerId = state.providerId;
        const eventItem = getActiveEvent();
        const provider = providerById.get(providerId);

        if (!providerId || !eventItem || !provider) {
            return;
        }

        const renderer = providerRenderers[providerId];
        if (!renderer) {
            renderError(providerId, provider.name, "No renderer is registered for this provider.");
            return;
        }

        const token = createRenderToken(providerId);

        try {
            await renderer(eventItem, providerId, token);
        } catch (error) {
            if (!isCurrentToken(providerId, token)) {
                return;
            }
            renderError(providerId, provider.name, error?.message || "Unexpected render failure.");
        }
    }

    function setActiveEvent(eventId) {
        if (!eventById.has(eventId)) {
            return;
        }

        state.eventId = eventId;
        const eventItem = getActiveEvent();
        setEventButtonState(eventId);
        renderEventSummary(eventItem);
        renderActiveProvider();
    }

    eventButtons.forEach((button) => {
        button.addEventListener("click", () => {
            setActiveEvent(button.dataset.mapDemoEvent);
        });
    });

    providerButtons.forEach((button) => {
        button.addEventListener("shown.bs.tab", () => {
            state.providerId = button.dataset.mapDemoProvider;
            renderActiveProvider();
        });
    });

    renderEventSummary(getActiveEvent());
    setEventButtonState(state.eventId);
    renderActiveProvider();
}
