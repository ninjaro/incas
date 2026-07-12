import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import "ol/ol.css";
import type { FeatureLike } from "ol/Feature.js";

import type {
  EventMapConfig,
  EventRegistrationSummary,
  PostTitle,
  PublicPost,
} from "../api/types";
import { getEventKind } from "../domain/eventKinds";
import { useLocale } from "../i18n/LocaleContext";
import { assetUrl } from "../utils/assets";

declare global {
  interface Window {
    __INCAS_FORCE_EVENT_MAP_FAILURE__?: boolean;
  }
}

const ORANGE = "#ff6600";
let worldAtlasLoad: Promise<unknown> | null = null;

async function loadWorldAtlas(): Promise<unknown> {
  if (!worldAtlasLoad) {
    worldAtlasLoad = import("world-atlas/countries-110m.json").then((module) => module.default);
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
  const [
    { default: Map },
    { default: View },
    { default: Feature },
    { default: TopoJSON },
    { default: Point },
    { default: LineString },
    { default: VectorSource },
    { default: VectorLayer },
    { default: TileLayer },
    { default: OSM },
    { default: Style },
    { default: Stroke },
    { default: Fill },
    { default: Circle },
    { default: Text },
    { fromLonLat },
    topology,
  ] = await Promise.all([
    import("ol/Map.js"),
    import("ol/View.js"),
    import("ol/Feature.js"),
    import("ol/format/TopoJSON.js"),
    import("ol/geom/Point.js"),
    import("ol/geom/LineString.js"),
    import("ol/source/Vector.js"),
    import("ol/layer/Vector.js"),
    import("ol/layer/Tile.js"),
    import("ol/source/OSM.js"),
    import("ol/style/Style.js"),
    import("ol/style/Stroke.js"),
    import("ol/style/Fill.js"),
    import("ol/style/Circle.js"),
    import("ol/style/Text.js"),
    import("ol/proj.js"),
    loadWorldAtlas(),
  ]);
  const target = config.target;
  const origin = target.origin;
  const destination = target.destination;
  if (!origin || !destination) throw new Error("Trip coordinates are incomplete.");

  const originCoordinate = fromLonLat(origin.coordinates);
  const destinationCoordinate = fromLonLat(destination.coordinates);
  const format = new TopoJSON();
  const features = format.readFeatures(topology, { featureProjection: "EPSG:3857" });

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
  const markerStyle = (feature: FeatureLike) =>
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
    style: (feature) =>
      feature.getGeometry()?.getType() === "LineString" ? lineStyle : markerStyle(feature),
  });
  const map = new Map({
    target: root,
    layers: [new TileLayer({ source: new OSM() }), regionLayer, tripLayer],
    view: new View({ center: fromLonLat(target.center ?? [6.07, 50.24]), zoom: target.zoom ?? 4.2 }),
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
  const [am5, am5map, worldModule] = await Promise.all([
    import("@amcharts/amcharts5"),
    import("@amcharts/amcharts5/map"),
    import("@amcharts/amcharts5-geodata/worldLow"),
  ]);
  const world = worldModule.default;
  const chartRoot = am5.Root.new(rootElement);
  const target = config.target;
  const chart = chartRoot.container.children.push(
    am5map.MapChart.new(chartRoot, {
      panX: "translateX",
      panY: "translateY",
      wheelX: "zoom",
      wheelY: "zoom",
      projection: am5map.geoMercator(),
      homeGeoPoint: { longitude: target.center?.[0] ?? 15, latitude: target.center?.[1] ?? 30 },
      homeZoomLevel: target.zoom ?? 1.8,
    }),
  );
  chart.set("zoomControl", am5map.ZoomControl.new(chartRoot, {}));
  const base = chart.series.push(
    am5map.MapPolygonSeries.new(chartRoot, { geoJSON: world, exclude: ["AQ"] }),
  );
  base.mapPolygons.template.setAll({
    fill: am5.color(0xf4e7dc),
    stroke: am5.color(0x111827),
    strokeWidth: 0.55,
    tooltipText: "{name}",
  });
  if (["country", "country_group"].includes(target.kind) && target.countryCodes?.length) {
    const focus = chart.series.push(
      am5map.MapPolygonSeries.new(chartRoot, {
        geoJSON: world,
        include: target.countryCodes.map((code) => code.toUpperCase()),
      }),
    );
    focus.mapPolygons.template.setAll({
      fill: am5.color(0xff6600),
      stroke: am5.color(0x111827),
      strokeWidth: 0.95,
      tooltipText: "{name}",
    });
  }
  if (target.marker) {
    const points = chart.series.push(am5map.MapPointSeries.new(chartRoot, {}));
    points.bullets.push(() => am5.Bullet.new(chartRoot, {
      sprite: am5.Circle.new(chartRoot, {
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

function MapCanvas({ config, unavailableLabel }: { config: EventMapConfig; unavailableLabel: string }) {
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
    const renderPromise = window.__INCAS_FORCE_EVENT_MAP_FAILURE__
      ? Promise.reject(new Error("Forced event-map failure."))
      : render(element, config);
    void renderPromise
      .then((dispose) => {
        if (disposed) dispose();
        else cleanup = dispose;
      })
      .catch((reason: unknown) => {
        if (!disposed) {
          console.warn("Event map unavailable", reason);
          setError(unavailableLabel);
        }
      });
    return () => {
      disposed = true;
      cleanup?.();
      element.replaceChildren();
    };
  }, [config, unavailableLabel]);

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
      {registration.depositExplanation ? <span>{de && registration.isDeposit ? "Die Kaution wird nach der Teilnahme zurückgezahlt." : registration.depositExplanation}</span> : null}
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

export function PinnedBadge({ locale = "en" }: { locale?: string }) {
  return <span className="badge badge-brand">{locale === "de" ? "Angepinnt" : "Pinned"}</span>;
}

export function ArchivedBadge({ locale = "en" }: { locale?: string }) {
  return <span className="badge badge-neutral">{locale === "de" ? "Archiviert" : "Archived"}</span>;
}

export function EventMap({ config }: { config: EventMapConfig }) {
  const { locale } = useLocale();
  const de = locale === "de";
  const targetLabel = config.target.destination?.name ?? config.target.label ?? config.title;
  const localizedTitle = de
    ? config.target.kind === "trip" ? `Ausflug nach ${targetLabel}` : "Karte zum Event"
    : config.title;
  const localizedDescription = de
    ? config.target.kind === "trip"
      ? `Aachen und ${targetLabel} im regionalen Zusammenhang.`
      : config.target.kind === "marker"
        ? `${targetLabel} ist auf der Karte markiert.`
        : `${targetLabel} ist orange hervorgehoben.`
    : config.description;
  return (
    <section className="event-map" aria-labelledby="event-map-title">
      <div className="event-map-copy">
        <div><h2 id="event-map-title">{localizedTitle}</h2><p>{localizedDescription}</p></div>
        <small>{config.providerName}</small>
      </div>
      <MapCanvas config={config} unavailableLabel={locale === "de" ? "Die Karte ist momentan nicht verfügbar. Die Eventinformationen bleiben unten verfügbar." : "The map is currently unavailable. Event information remains available below."} />
      {config.note ? <p className="event-map-note">{de ? (config.target.kind === "trip" ? "Die gestrichelte Linie dient nur zur Orientierung und zeigt keine echte Route." : "Du kannst die Karte zoomen und verschieben.") : config.note}</p> : null}
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
          {event.isPinned ? <PinnedBadge locale={locale} /> : null}
          {event.publicationState === "archived" ? <ArchivedBadge locale={locale} /> : null}
          {event.registration ? <EventAvailability registration={event.registration} locale={locale} /> : null}
        </div>
        {event.registration ? <EventPaymentNotice registration={event.registration} locale={locale} /> : null}
      </div>
    </article>
  );
}
