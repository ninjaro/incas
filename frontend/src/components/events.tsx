import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import type {
  EventMapConfig,
  EventRegistrationSummary,
  PostTitle,
  PublicPost,
} from "../api/types";
import { getEventKind } from "../domain/eventKinds";
import { assetUrl } from "../utils/assets";

const ORANGE = "#ff6600";
const OPENLAYERS_CSS = "https://cdn.jsdelivr.net/npm/ol@10.7.0/ol.css";
const OPENLAYERS_JS = "https://cdn.jsdelivr.net/npm/ol@10.7.0/dist/ol.js";
const WORLD_ATLAS = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const AMCHARTS_BASE = "https://cdn.amcharts.com/lib/5/index.js";
const AMCHARTS_MAP = "https://cdn.amcharts.com/lib/5/map.js";
const AMCHARTS_GEODATA = "https://cdn.amcharts.com/lib/5/geodata/worldLow.js";

const scriptLoads = new Map<string, Promise<void>>();
const styleLoads = new Map<string, Promise<void>>();
let worldAtlasLoad: Promise<unknown> | null = null;

function browserGlobal(name: string): unknown {
  return (window as unknown as Record<string, unknown>)[name];
}

function loadScript(src: string, ready: () => boolean): Promise<void> {
  if (ready()) return Promise.resolve();
  const cached = scriptLoads.get(src);
  if (cached) return cached;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => (ready() ? resolve() : reject(new Error("Map library did not initialize.")));
    script.onerror = () => reject(new Error("Map library could not be loaded."));
    document.head.append(script);
  });
  scriptLoads.set(src, promise);
  return promise;
}

function loadStyle(href: string): Promise<void> {
  const cached = styleLoads.get(href);
  if (cached) return cached;
  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLLinkElement>(`link[href="${href}"]`);
    if (existing) {
      resolve();
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error("Map styles could not be loaded."));
    document.head.append(link);
  });
  styleLoads.set(href, promise);
  return promise;
}

async function loadOpenLayers(): Promise<Record<string, unknown>> {
  await loadStyle(OPENLAYERS_CSS);
  await loadScript(OPENLAYERS_JS, () => Boolean(browserGlobal("ol")));
  return browserGlobal("ol") as Record<string, unknown>;
}

async function loadWorldAtlas(): Promise<unknown> {
  if (!worldAtlasLoad) {
    worldAtlasLoad = fetch(WORLD_ATLAS).then((response) => {
      if (!response.ok) throw new Error("World map data could not be loaded.");
      return response.json();
    });
  }
  return worldAtlasLoad;
}

function dashPattern(pixelDistance: number) {
  const length = Math.max(pixelDistance, 1);
  const count = Math.max(3, Math.floor(length / 44));
  const gapRatio = 0.68;
  const dash = length / (count + Math.max(count - 1, 0) * gapRatio);
  return { dash, gap: dash * gapRatio, width: dash < 12 ? 1.35 : dash < 18 ? 1.65 : 1.9 };
}

async function renderOpenLayers(root: HTMLDivElement, config: EventMapConfig): Promise<() => void> {
  const [ol, topology] = await Promise.all([loadOpenLayers(), loadWorldAtlas()]);
  const api = ol as Record<string, Record<string, new (...args: unknown[]) => unknown> & Record<string, unknown>>;
  const target = config.target;
  const origin = target.origin;
  const destination = target.destination;
  if (!origin || !destination) throw new Error("Trip coordinates are incomplete.");

  const proj = api.proj as unknown as { fromLonLat(point: [number, number]): unknown };
  const originCoordinate = proj.fromLonLat(origin.coordinates);
  const destinationCoordinate = proj.fromLonLat(destination.coordinates);
  const format = new (api.format.TopoJSON as unknown as new () => {
    readFeatures(value: unknown, options: Record<string, string>): unknown[];
  })();
  const features = format.readFeatures(topology, { featureProjection: "EPSG:3857" });
  const Style = api.style.Style as unknown as new (options: Record<string, unknown>) => unknown;
  const Stroke = api.style.Stroke as unknown as new (options: Record<string, unknown>) => {
    setWidth(value: number): void;
    setLineDash(value: number[]): void;
  };
  const Fill = api.style.Fill as unknown as new (options: Record<string, unknown>) => unknown;
  const Circle = api.style.Circle as unknown as new (options: Record<string, unknown>) => unknown;
  const Text = api.style.Text as unknown as new (options: Record<string, unknown>) => unknown;
  const Feature = api.Feature as unknown as new (options: Record<string, unknown>) => {
    changed(): void;
    get(key: string): string;
    getGeometry(): { getType(): string };
  };
  const Point = api.geom.Point as unknown as new (coordinate: unknown) => unknown;
  const LineString = api.geom.LineString as unknown as new (coordinates: unknown[]) => unknown;
  const VectorSource = api.source.Vector as unknown as new (options: Record<string, unknown>) => unknown;
  const VectorLayer = api.layer.Vector as unknown as new (options: Record<string, unknown>) => unknown;
  const TileLayer = api.layer.Tile as unknown as new (options: Record<string, unknown>) => unknown;
  const OSM = api.source.OSM as unknown as new () => unknown;

  const regionLayer = new VectorLayer({
    source: new VectorSource({ features }),
    style: new Style({
      fill: new Fill({ color: "rgba(244,231,220,.34)" }),
      stroke: new Stroke({ color: "#111827", width: 0.7 }),
    }),
  });
  const lineStroke = new Stroke({ color: ORANGE, width: 2, lineDash: [12, 8], lineCap: "round" });
  const lineStyle = new Style({ stroke: lineStroke });
  const tripLine = new Feature({ geometry: new LineString([originCoordinate, destinationCoordinate]) });
  const markers = [
    new Feature({ geometry: new Point(originCoordinate), name: origin.name, role: "origin" }),
    new Feature({ geometry: new Point(destinationCoordinate), name: destination.name, role: "destination" }),
  ];
  const markerStyle = (feature: InstanceType<typeof Feature>) =>
    new Style({
      image: new Circle({
        radius: feature.get("role") === "destination" ? 6 : 5,
        fill: new Fill({ color: feature.get("role") === "destination" ? ORANGE : "#111827" }),
        stroke: new Stroke({ color: "#111827", width: 1 }),
      }),
      text: new Text({
        text: feature.get("name"),
        offsetY: feature.get("role") === "destination" ? -15 : 15,
        font: "12px sans-serif",
        fill: new Fill({ color: "#111827" }),
        backgroundFill: new Fill({ color: "rgba(255,253,251,.94)" }),
        backgroundStroke: new Stroke({ color: ORANGE, width: 1 }),
        padding: [2, 6, 2, 6],
      }),
    });
  const tripLayer = new VectorLayer({
    source: new VectorSource({ features: [tripLine, ...markers] }),
    style: (feature: InstanceType<typeof Feature>) =>
      feature.getGeometry().getType() === "LineString" ? lineStyle : markerStyle(feature),
  });
  const MapClass = api.Map as unknown as new (options: Record<string, unknown>) => {
    getPixelFromCoordinate(coordinate: unknown): [number, number] | null;
    on(name: string, callback: () => void): void;
    setTarget(target?: HTMLElement): void;
  };
  const View = api.View as unknown as new (options: Record<string, unknown>) => unknown;
  const map = new MapClass({
    target: root,
    layers: [new TileLayer({ source: new OSM() }), regionLayer, tripLayer],
    view: new View({ center: proj.fromLonLat(target.center ?? [6.07, 50.24]), zoom: target.zoom ?? 4.2 }),
  });
  const updateDash = () => {
    const start = map.getPixelFromCoordinate(originCoordinate);
    const end = map.getPixelFromCoordinate(destinationCoordinate);
    if (!start || !end) return;
    const pattern = dashPattern(Math.hypot(end[0] - start[0], end[1] - start[1]));
    lineStroke.setWidth(pattern.width);
    lineStroke.setLineDash([pattern.dash, pattern.gap]);
    tripLine.changed();
  };
  map.on("moveend", updateDash);
  map.on("change:size", updateDash);
  updateDash();
  return () => map.setTarget();
}

async function renderAmCharts(rootElement: HTMLDivElement, config: EventMapConfig): Promise<() => void> {
  await loadScript(AMCHARTS_BASE, () => Boolean(browserGlobal("am5")));
  await loadScript(AMCHARTS_MAP, () => Boolean(browserGlobal("am5map")));
  await loadScript(AMCHARTS_GEODATA, () => Boolean(browserGlobal("am5geodata_worldLow")));
  const am5 = browserGlobal("am5") as Record<string, (...args: unknown[]) => unknown> & {
    Root: { new: (element: HTMLElement) => Record<string, unknown> };
    color(value: number): unknown;
  };
  const am5map = browserGlobal("am5map") as Record<string, Record<string, (...args: unknown[]) => unknown>>;
  const chartRoot = am5.Root.new(rootElement) as Record<string, unknown> & {
    container: { children: { push(value: unknown): unknown } };
    dispose(): void;
  };
  const target = config.target;
  const MapChart = am5map.MapChart as unknown as { new: (root: unknown, options: unknown) => unknown };
  const chart = chartRoot.container.children.push(
    MapChart.new(chartRoot, {
      panX: "translateX",
      panY: "translateY",
      wheelX: "zoom",
      wheelY: "zoom",
      projection: (am5map.geoMercator as unknown as () => unknown)(),
      homeGeoPoint: { longitude: target.center?.[0] ?? 15, latitude: target.center?.[1] ?? 30 },
      homeZoomLevel: target.zoom ?? 1.8,
    }),
  ) as {
    series: { push(value: unknown): unknown };
    set(name: string, value: unknown): void;
    zoomToGeoPoint(point: { longitude: number; latitude: number }, zoom: number, animate: boolean): void;
  };
  const ZoomControl = am5map.ZoomControl as unknown as { new: (root: unknown, options: unknown) => unknown };
  chart.set("zoomControl", ZoomControl.new(chartRoot, {}));
  const PolygonSeries = am5map.MapPolygonSeries as unknown as { new: (root: unknown, options: unknown) => unknown };
  const base = chart.series.push(
    PolygonSeries.new(chartRoot, { geoJSON: browserGlobal("am5geodata_worldLow"), exclude: ["AQ"] }),
  ) as { mapPolygons: { template: { setAll(value: unknown): void } } };
  base.mapPolygons.template.setAll({
    fill: am5.color(0xf4e7dc),
    stroke: am5.color(0x111827),
    strokeWidth: 0.55,
    tooltipText: "{name}",
  });
  if (["country", "country_group"].includes(target.kind) && target.countryCodes?.length) {
    const focus = chart.series.push(
      PolygonSeries.new(chartRoot, {
        geoJSON: browserGlobal("am5geodata_worldLow"),
        include: target.countryCodes.map((code) => code.toUpperCase()),
      }),
    ) as { mapPolygons: { template: { setAll(value: unknown): void } } };
    focus.mapPolygons.template.setAll({
      fill: am5.color(0xff6600),
      stroke: am5.color(0x111827),
      strokeWidth: 0.95,
      tooltipText: "{name}",
    });
  }
  if (target.marker) {
    const MapPointSeries = am5map.MapPointSeries as unknown as { new: (root: unknown, options: unknown) => unknown };
    const points = chart.series.push(MapPointSeries.new(chartRoot, {})) as {
      bullets: { push(factory: () => unknown): void };
      data: { setAll(value: unknown[]): void };
    };
    const Bullet = am5.Bullet as unknown as { new: (root: unknown, options: unknown) => unknown };
    const Circle = am5.Circle as unknown as { new: (root: unknown, options: unknown) => unknown };
    points.bullets.push(() => Bullet.new(chartRoot, {
      sprite: Circle.new(chartRoot, {
        radius: 7,
        fill: am5.color(0xff6600),
        stroke: am5.color(0x111827),
        strokeWidth: 2,
        tooltipText: "{name}",
      }),
    }));
    points.data.setAll([
      {
        geometry: { type: "Point", coordinates: target.marker.coordinates },
        name: target.marker.name,
      },
    ]);
  }
  queueMicrotask(() => {
    chart.zoomToGeoPoint(
      { longitude: target.center?.[0] ?? 15, latitude: target.center?.[1] ?? 30 },
      target.zoom ?? 1.8,
      true,
    );
  });
  return () => chartRoot.dispose();
}

function MapCanvas({ config }: { config: EventMapConfig }) {
  const root = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    setError(null);
    element.replaceChildren();
    const render = config.providerId === "openlayers" ? renderOpenLayers : renderAmCharts;
    void render(element, config)
      .then((dispose) => {
        if (disposed) dispose();
        else cleanup = dispose;
      })
      .catch((reason: unknown) => {
        if (!disposed) setError(reason instanceof Error ? reason.message : "Map unavailable.");
      });
    return () => {
      disposed = true;
      cleanup?.();
      element.replaceChildren();
    };
  }, [config]);

  if (error) {
    return <div className="event-map-fallback" role="status">{error}</div>;
  }
  return <div ref={root} className="event-map-canvas" aria-label={config.description} />;
}

export function EventTitle({ title, as = "h3" }: { title: PostTitle; as?: "h1" | "h2" | "h3" }) {
  const Heading = as;
  return (
    <Heading className="event-title">
      {title.prefix && title.focus ? (
        <><span>{title.prefix} </span><strong>{title.focus}</strong></>
      ) : title.full}
    </Heading>
  );
}

export function EventMarker({ eventKind }: { eventKind: string | null }) {
  const marker = eventKind ? getEventKind(eventKind)?.marker : "muted";
  return <span className={`event-marker event-marker-${marker ?? "muted"}`} aria-hidden="true" />;
}

function IconDrawing({ icon }: { icon: string }) {
  if (icon === "globe") return <><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16"/></>;
  if (icon === "chat") return <path d="M4 5h16v11H9l-5 4V5Z"/>;
  if (icon === "dice") return <><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01"/></>;
  if (icon === "mic") return <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/></>;
  if (icon === "music") return <><path d="M9 18V6l10-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></>;
  if (icon === "egg") return <path d="M12 3c4 0 7 7 7 11a7 7 0 0 1-14 0c0-4 3-11 7-11Z"/>;
  if (icon === "signpost") return <><path d="M12 3v18M5 6h13l2 3-2 3H5V6ZM4 14h12l-2 4H4v-4Z"/></>;
  if (icon === "house") return <><path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10M10 20v-6h4v6"/></>;
  if (icon === "people") return <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20c0-5 3-8 6-8s6 3 6 8M15 14c3 0 5 2 5 6"/></>;
  if (icon === "activity") return <path d="M3 12h4l2-6 4 12 2-6h6"/>;
  if (icon === "sparkles") return <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3ZM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/>;
  return <circle cx="12" cy="12" r="8"/>;
}

export function EventIcon({ eventKind = null, icon, label }: { eventKind?: string | null; icon?: string; label?: string }) {
  const kind = eventKind ? getEventKind(eventKind) : undefined;
  return (
    <span className="event-icon" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <IconDrawing icon={icon ?? kind?.icon ?? "event"} />
      </svg>
    </span>
  );
}

export function EventDate({ start, end, locale }: { start: string; end?: string | null; locale: string }) {
  const startDate = new Date(start);
  const date = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(startDate);
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(startDate);
  const endTime = end ? new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(end)) : null;
  return <time dateTime={start}>{date}, {time}{endTime ? ` - ${endTime}` : ""}</time>;
}

export function EventPaymentNotice({ registration, locale = "en" }: { registration: EventRegistrationSummary; locale?: string }) {
  if (registration.priceCents === null || registration.priceCents <= 0) return null;
  const de = locale === "de";
  const amount = new Intl.NumberFormat(locale, { style: "currency", currency: registration.currency }).format(registration.priceCents / 100);
  return (
    <div className="event-payment-notice">
      <strong>{registration.isDeposit ? `${de ? "Rückzahlbare Kaution" : "Refundable deposit"}: ${amount}` : `${de ? "Preis" : "Price"}: ${amount}`}</strong>
      {registration.depositExplanation ? <span>{registration.depositExplanation}</span> : null}
    </div>
  );
}

export function EventAvailability({ registration, locale = "en" }: { registration: EventRegistrationSummary; locale?: string }) {
  const de = locale === "de";
  const label = registration.availability === "closed"
    ? (de ? "Anmeldung geschlossen" : "Registration closed")
    : registration.availability === "waiting_list"
      ? (de ? `Warteliste offen (${registration.waitingListCount})` : `Waiting list open (${registration.waitingListCount} waiting)`)
      : (de ? `${registration.placesRemaining} von ${registration.capacity} Plätzen frei` : `${registration.placesRemaining} of ${registration.capacity} places available`);
  return <span className={`event-availability is-${registration.availability}`}>{label}</span>;
}

export function EventRegistrationStatus({ status, position, locale = "en" }: { status: string; position?: number | null; locale?: string }) {
  const labels: Record<string, [string, string]> = {
    approved: ["Approved", "Bestätigt"],
    cancelled: ["Cancelled", "Storniert"],
    waiting_payment: ["Waiting for payment", "Wartet auf Zahlung"],
    waiting_list: ["Waiting list", "Warteliste"],
    waiting_refund: ["Waiting for refund", "Wartet auf Rückzahlung"],
  };
  const label = labels[status]?.[locale === "de" ? 1 : 0] ?? status.replaceAll("_", " ");
  return <span className={`badge badge-${status === "approved" ? "ok" : status === "cancelled" ? "bad" : "warn"}`}>{label}{position ? ` - ${locale === "de" ? "Platz" : "position"} ${position}` : ""}</span>;
}

export function EventFeatureSlot({ event, feature, children }: { event: PublicPost; feature: string; children: ReactNode }) {
  return event.features.includes(feature) ? <>{children}</> : null;
}

export function PinnedBadge() {
  return <span className="badge badge-brand">Pinned</span>;
}

export function ArchivedBadge() {
  return <span className="badge badge-neutral">Archived</span>;
}

export function EventMap({ config }: { config: EventMapConfig }) {
  return (
    <section className="event-map" aria-labelledby="event-map-title">
      <div className="event-map-copy">
        <div><h2 id="event-map-title">{config.title}</h2><p>{config.description}</p></div>
        <small>{config.providerName}</small>
      </div>
      <MapCanvas config={config} />
      {config.note ? <p className="event-map-note">{config.note}</p> : null}
    </section>
  );
}

export function EventCard({ event, locale, compact = false }: { event: PublicPost; locale: string; compact?: boolean }) {
  const imageUrl = assetUrl(event.imageUrl);
  return (
    <article className={`event-card${compact ? " is-compact" : ""}`}>
      {imageUrl && !compact ? <img src={imageUrl} alt="" loading="lazy" /> : null}
      <div className="event-card-body">
        <div className="event-card-title-row">
          <EventMarker eventKind={event.eventKind} />
          <Link to={`/events/${event.slug}`}><EventTitle title={event.title} /></Link>
        </div>
        {event.startsAt ? <EventDate start={event.startsAt} end={event.endsAt} locale={locale} /> : null}
        {!compact && event.summary ? <p>{event.summary}</p> : null}
        <div className="event-card-flags">
          {event.isPinned ? <PinnedBadge /> : null}
          {event.publicationState === "archived" ? <ArchivedBadge /> : null}
          {event.registration ? <EventAvailability registration={event.registration} locale={locale} /> : null}
        </div>
        {event.registration ? <EventPaymentNotice registration={event.registration} locale={locale} /> : null}
      </div>
    </article>
  );
}
