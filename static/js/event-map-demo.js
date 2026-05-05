const ORANGE = "#ff6600";
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

    function getHighlightAlpha2Set(target) {
        return new Set((target.country_codes || []).map(normalizeAlpha2).filter(Boolean));
    }

    function getMapCenter(target) {
        const center = target?.center;
        return Array.isArray(center) && center.length === 2 ? center : DEFAULT_CENTER;
    }

    function getMapZoom(target) {
        return target?.view?.zoom || DEFAULT_ZOOM;
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

    const providerRenderers = {
        "amcharts-maps": renderAmChartsProvider,
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
