import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

import { geoGraticule10, geoNaturalEarth1, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeoJsonProperties, FeatureCollection, Geometry } from "geojson";
import worldTopo from "world-atlas/countries-110m.json";

import type { PublicPost, PublicPostsResponse } from "../api/types";
import { EventCard, EventDate, EventIcon, EventMarker, EventTitle, PinnedBadge } from "../components/events";
import { EmptyState, ErrorState, Loading } from "../components/ui";
import { useData } from "../data/DataProviderContext";
import { usePublicTheme } from "../features/themes/usePublicTheme";
import { useAsync } from "../hooks/useAsync";
import { useLocale } from "../i18n/LocaleContext";
import { assetUrl } from "../utils/assets";
import { downloadEventIcs } from "../utils/ics";

function PostCard({ post, de }: { post: PublicPost; de: boolean }) {
  return <article className="post-card"><Link className="post-card-main card-primary-link" to={`/events/${post.slug}`} aria-label={post.title.full}>{post.isPinned ? <PinnedBadge locale={de ? "de" : "en"} /> : null}<h3>{post.title.full}</h3><p>{post.summary}</p></Link></article>;
}

function Upcoming({ events, locale, limit = 6 }: { events: PublicPost[]; locale: string; limit?: number }) {
  const de = locale === "de";
  return (
    <section className="landing-section" aria-labelledby="upcoming-title">
      <div className="landing-section-head"><div><p className="page-kicker">{de ? "Als Nächstes" : "What's next"}</p><h2 id="upcoming-title">{de ? "Bevorstehende Events" : "Upcoming events"}</h2></div><Link to="/calendar" className="btn btn-outline">{de ? "Kalender öffnen" : "View calendar"}</Link></div>
      {events.length ? <div className="event-grid">{events.slice(0, limit).map((event) => <EventCard key={event.slug} event={event} locale={locale} />)}</div> : <EmptyState>{de ? "Aktuell sind keine Events angekündigt." : "No upcoming events are announced right now."}</EmptyState>}
    </section>
  );
}

function AboutAndOffers() {
  const { site, locale } = useLocale();
  const de = locale === "de";
  return (
    <section className="landing-about-offers">
      <div><p className="page-kicker">INCAS Aachen</p><h2>{de ? "International und lokal zusammen" : "International and local, together"}</h2><p>{de ? "INCAS ist eine studentische Initiative in Aachen. Ehrenamtliche Teams organisieren Begegnungen, Sprachaustausch und gemeinsame Ausflüge." : "INCAS is a student initiative in Aachen. Volunteer teams organize meetups, language exchange, cultural events and trips."}</p><Link to="/about" className="btn btn-outline">{de ? "Über INCAS" : "About INCAS"}</Link></div>
      <div className="landing-offer-links">{site?.offers.pages.slice(0, 8).map((offer) => <Link key={offer.to} to={offer.to}><EventIcon icon={offer.icon} /><span><strong>{offer.title}</strong><small>{offer.description}</small></span></Link>)}</div>
    </section>
  );
}

function News({ posts, locale }: { posts: PublicPost[]; locale: string }) {
  if (!posts.length) return null;
  const de = locale === "de";
  return <section className="landing-section"><div className="landing-section-head"><h2>{de ? "Aktuelles" : "Latest posts"}</h2></div><div className="post-grid">{posts.map((post) => <PostCard key={post.slug} post={post} de={de} />)}</div></section>;
}

/* ---------- playful landing (INCAS Design System handoff) ---------- */

type LandFeatures = FeatureCollection<Geometry, GeoJsonProperties>;

let landCache: LandFeatures | null = null;

function getLand(): LandFeatures {
  if (!landCache) {
    // world-atlas countries-110m, Antarctica removed per the reference.
    const topo = worldTopo as unknown as Parameters<typeof feature>[0];
    const countries = (topo as unknown as { objects: { countries: Parameters<typeof feature>[1] } }).objects.countries;
    const land = feature(topo, countries) as unknown as LandFeatures;
    land.features = land.features.filter((f) => f.id !== "010");
    landCache = land;
  }
  return landCache;
}

/* The envelope animates once per session: after that, switching tabs or
   revisiting the scene shows the letter already open instead of re-sealing
   and replaying (About us remounts on every section-tab click). */
let letterRevealedOnce = false;

/** Faded flat world map behind the hero text (d3 Natural Earth projection). */
function HeroMap() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const land = getLand();

    const draw = () => {
      const w = host.clientWidth;
      if (!w) return;
      const wide = window.innerWidth > 700;
      const hero = host.parentElement as HTMLElement | null;
      const scale = 1.06;
      let proj = geoNaturalEarth1().fitWidth(w * scale, land);
      let path = geoPath(proj);
      let bounds = path.bounds(land);
      // Wide screens: size the hero to the viewport minus the nav and a
      // ~130px peek, so "This month's events" shows above the fold; then fit
      // the WHOLE map inside that hero (narrower fit-by-height when the
      // width-fit map would be taller) - the world is never cropped. The
      // phone layout sizes the hero itself, so leave it alone there.
      if (wide && hero) {
        const nav = document.querySelector(".site-nav");
        const navH = nav ? nav.getBoundingClientRect().height : 64;
        const target = Math.max(560, Math.round(window.innerHeight - navH - 130));
        hero.style.minHeight = `${target}px`;
        const availH = target - 60;
        if (bounds[1][1] > availH) {
          proj = geoNaturalEarth1().fitHeight(availH, land);
          path = geoPath(proj);
          bounds = path.bounds(land);
        }
      } else if (hero) {
        hero.style.minHeight = "";
      }
      const h = host.clientHeight;
      if (!h) return;
      const mapW = bounds[1][0];
      const mapH = bounds[1][1];
      const vbY = wide ? (mapH - h) / 2 : Math.max(0, (mapH - h) / 2);
      host.innerHTML =
        `<svg width="${w}" height="${h}" viewBox="${(mapW - w) / 2} ${vbY} ${w} ${h}">` +
        `<path d="${path(land)}" fill="#e2cb9c" stroke="#d9bf8b" stroke-width="0.6"></path></svg>`;
    };

    draw();
    window.addEventListener("resize", draw);
    return () => {
      window.removeEventListener("resize", draw);
      const hero = host.parentElement as HTMLElement | null;
      if (hero) hero.style.minHeight = "";
    };
  }, []);

  return <div className="hero-map" ref={hostRef} aria-hidden="true" />;
}

/** Flat globe (orthographic, olive sea, cream land) as a static SVG. */
function GlobeSphere() {
  const size = 300;
  const land = getLand();
  const proj = geoOrthographic().rotate([-12, -32]).fitExtent(
    [[5, 5], [size - 5, size - 5]],
    { type: "Sphere" },
  );
  const path = geoPath(proj);
  return (
    <span className="globe-sphere" aria-hidden="true">
      <svg viewBox={`0 0 ${size} ${size}`}>
        <path d={path({ type: "Sphere" }) ?? ""} fill="#8fa057" />
        <path d={path(geoGraticule10()) ?? ""} fill="none" stroke="#414b21" strokeOpacity="0.16" strokeWidth="1.6" />
        <path d={path(land) ?? ""} fill="#f6ead6" />
        <path d={path({ type: "Sphere" }) ?? ""} fill="none" stroke="#414b21" strokeWidth="6" />
      </svg>
    </span>
  );
}

/* Event-kind badge stickers orbiting the globe, verbatim from the handoff. */
const GLOBE_BADGES: Array<{ a: string; accent?: boolean; to: string; label: { en: string; de: string }; icon: ReactNode }> = [
  {
    a: "0deg",
    accent: true,
    to: "/events/archive?e=country-evening",
    label: { en: "Country Evening", de: "Länderabend" },
    icon: (
      <svg viewBox="-26 -26 52 52" aria-hidden="true">
        <path fill="currentColor" fillRule="evenodd" d="M-21 -4 a3 3 0 0 1 3-3 h36 a3 3 0 0 1 3 3 a3 3 0 0 1 -3 3 h-1 v8 a10 10 0 0 1 -10 10 h-14 a10 10 0 0 1 -10-10 v-8 h-1 a3 3 0 0 1 -3-3 Z M-3 -7 a3 3 0 0 1 6 0 Z" />
        <path fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" d="M-9 -13c4-4-2-8 1-12M9 -13c4-4-2-8 1-12" />
      </svg>
    ),
  },
  {
    a: "60deg",
    to: "/events/archive?e=cafe-lingua",
    label: { en: "Café Lingua", de: "Café Lingua" },
    icon: (
      <svg viewBox="-26 -26 52 52" aria-hidden="true">
        <path fill="currentColor" d="M-24 -10 a6 6 0 0 1 6-6 h22 a6 6 0 0 1 6 6 v9 a6 6 0 0 1 -6 6 h-10 l-9 8 v-8 h-3 a6 6 0 0 1 -6-6 Z" />
        <path fill="currentColor" opacity="0.72" d="M14 -4 h4 a6 6 0 0 1 6 6 v7 a6 6 0 0 1 -6 6 h-1 v7 l-8-7 h-3 a6 6 0 0 1 -5-6 l9 0 a9 9 0 0 0 4-3 Z" />
      </svg>
    ),
  },
  {
    a: "120deg",
    to: "/events/archive?e=board-games",
    label: { en: "Board Games", de: "Brettspiele" },
    icon: (
      <svg viewBox="-26 -26 52 52" aria-hidden="true">
        <path fill="currentColor" fillRule="evenodd" d="M-20 -11 a9 9 0 0 1 9-9 h22 a9 9 0 0 1 9 9 v22 a9 9 0 0 1 -9 9 h-22 a9 9 0 0 1 -9-9 Z M-9 -13 a4 4 0 1 0 0.01 0 Z M9 -13 a4 4 0 1 0 0.01 0 Z M0 -4 a4 4 0 1 0 0.01 0 Z M-9 5 a4 4 0 1 0 0.01 0 Z M9 5 a4 4 0 1 0 0.01 0 Z" />
      </svg>
    ),
  },
  {
    a: "180deg",
    to: "/events/archive?e=weekend-trip",
    label: { en: "International Weekend trips", de: "Internationale Wochenend-Ausflüge" },
    icon: (
      <svg viewBox="-26 -26 52 52" aria-hidden="true">
        <path fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" d="M0 23V-21" />
        <path fill="currentColor" d="M-3 -19 h22 a2.5 2.5 0 0 1 2 1 l6 6.5 a2.5 2.5 0 0 1 0 3 l-6 6.5 a2.5 2.5 0 0 1 -2 1 h-22 Z" />
        <path fill="currentColor" opacity="0.72" d="M3 1 h-22 a2.5 2.5 0 0 0 -2 1 l-6 6.5 a2.5 2.5 0 0 0 0 3 l6 6.5 a2.5 2.5 0 0 0 2 1 h22 Z" />
      </svg>
    ),
  },
  {
    a: "240deg",
    to: "/events/archive?e=international-breakfast",
    label: { en: "International Breakfast", de: "Internationales Frühstück" },
    icon: (
      <svg viewBox="-26 -26 52 52" aria-hidden="true">
        <path fill="currentColor" d="M-19 -7 a2 2 0 0 1 2-2 h24 a2 2 0 0 1 2 2 v13 a13 13 0 0 1 -14 13 a13 13 0 0 1 -14-13 Z" />
        <path fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" d="M11 -3h5a7 7 0 0 1 0 14h-5" />
        <path fill="none" stroke="currentColor" strokeWidth="4.4" strokeLinecap="round" d="M-22 24h36" />
        <path fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" d="M-6 -15c4-4-2-8 1-12M6 -15c4-4-2-8 1-12" />
      </svg>
    ),
  },
  {
    a: "300deg",
    accent: true,
    to: "/karaoke",
    label: { en: "Karaoke", de: "Karaoke" },
    icon: (
      <svg viewBox="-26 -26 52 52" aria-hidden="true">
        <rect x="-8" y="-25" width="16" height="28" rx="8" fill="currentColor" />
        <path fill="none" stroke="currentColor" strokeWidth="4.4" strokeLinecap="round" d="M-14 5a14 14 0 0 0 28 0M0 19v5M-9 24h18" />
      </svg>
    ),
  },
];

function HeroGlobe({ de }: { de: boolean }) {
  const globeRef = useRef<HTMLDivElement>(null);
  // The badges are links: hold the idle drift while the pointer is over the
  // globe so nobody has to chase a moving target.
  const hoverRef = useRef(false);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const drift = calm ? 0.0009 : 0.0026;
    let scrollY = 0;
    let driftAccum = 0;
    let current = 0;
    let tilt = 0;
    let tiltCurrent = 0;
    let last = 0;
    let frameId = 0;

    const readScroll = () => {
      scrollY = window.scrollY || 0;
      tilt = Math.max(-14, Math.min(14, scrollY * 0.02));
    };
    const frame = (now: number) => {
      const dt = last ? Math.min(64, now - last) : 16;
      last = now;
      if (!hoverRef.current) driftAccum += dt * drift;
      const target = scrollY * 0.11 + driftAccum;
      current += (target - current) * 0.07;
      tiltCurrent += (tilt - tiltCurrent) * 0.06;
      globe.style.setProperty("--spin", current.toFixed(2));
      globe.style.setProperty("--tilt", tiltCurrent.toFixed(2));
      frameId = requestAnimationFrame(frame);
    };

    window.addEventListener("scroll", readScroll, { passive: true });
    readScroll();
    frameId = requestAnimationFrame(frame);
    return () => {
      window.removeEventListener("scroll", readScroll);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div
      className="landing-hero-globe"
      ref={globeRef}
      role="group"
      aria-label={de ? "Unsere Event-Arten" : "Our kinds of events"}
      onPointerEnter={() => { hoverRef.current = true; }}
      onPointerLeave={() => { hoverRef.current = false; }}
    >
      <span className="globe-ring" aria-hidden="true" />
      {GLOBE_BADGES.map((badge) => {
        const label = de ? badge.label.de : badge.label.en;
        return (
          <Link
            key={badge.a}
            to={badge.to}
            className={`globe-badge${badge.accent ? " is-accent" : ""}`}
            style={{ "--a": badge.a } as CSSProperties}
            aria-label={label}
            title={label}
          >
            {badge.icon}
          </Link>
        );
      })}
      <GlobeSphere />
    </div>
  );
}

function formatStationTime(date: Date, locale: string): string {
  const lang = locale === "de" ? "de" : "en";
  const weekday = date.toLocaleString(lang, { weekday: "short" });
  const month = date.toLocaleString(lang, { month: "short" });
  const time = date.toLocaleString(lang, { hour: "numeric", minute: "2-digit", hour12: lang === "en" });
  return `${weekday} · ${month} ${date.getDate()} · ${time}`;
}

const KIND_PHOTO: Record<string, string> = {
  cafe_lingua: "img/site/cafe-lingua.webp",
  country_evening: "img/site/country-evening.webp",
  breakfast: "img/site/international-breakfast.webp",
  trip: "img/site/international-weekend.webp",
  board_games: "img/site/international-tuesday.webp",
  karaoke: "img/site/international-tuesday.webp",
  dance: "img/site/language-tandem.webp",
};

function eventPhoto(event: PublicPost): string | null {
  if (event.imageUrl) return assetUrl(event.imageUrl);
  const byKind = event.eventKind ? KIND_PHOTO[event.eventKind] : undefined;
  return assetUrl(byKind ?? "img/site/cafe-lingua.webp");
}

const PHOTO_TILTS = [
  { rot: "4deg", drop: "16px" },
  { rot: "-3deg", drop: "2px" },
  { rot: "3deg", drop: "14px" },
  { rot: "-3deg", drop: "6px" },
];

function SectionCompass() {
  return (
    <svg className="section-compass" viewBox="0 0 160 160" aria-hidden="true" focusable="false">
      <g transform="translate(80 80)" stroke="#6a6252" fill="none" opacity="0.75">
        <circle r={62} strokeWidth="1.6" opacity="0.7" />
        <circle r={10} strokeWidth="1.6" />
        <path d="M -46 0 L -10 5 L 46 0 L -10 -5 Z" fill="#6a6252" fillOpacity="0.45" stroke="none" />
        <path d="M 0 46 L 5 10 L 0 -20 L -5 10 Z" fill="#6a6252" fillOpacity="0.45" stroke="none" />
        <path d="M 0 -70 L 7 -8 L 0 9 L -7 -8 Z" fill="#4f6a6a" fillOpacity="0.9" stroke="none" />
        <circle r={3.5} fill="#4f6a6a" stroke="none" />
      </g>
    </svg>
  );
}

/** N° 01: this month's events as photos pegged along a hanging string. */
function EventsString({ events, locale }: { events: PublicPost[]; locale: string }) {
  const de = locale === "de";
  const now = new Date();
  const monthLabel = now.toLocaleString(de ? "de" : "en", { month: "long", year: "numeric" });
  const lineup = events
    .filter((event) => event.startsAt)
    .map((event) => ({ event, date: new Date(event.startsAt as string) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4);

  return (
    <section className="treasure landing-plain" aria-label={de ? `Events im ${monthLabel}` : `Upcoming events in ${monthLabel}`} style={{ position: "relative" }}>
      <SectionCompass />
      <div className="landing-section-head">
        <h2>
          <span className="section-no" aria-hidden="true">N° 01 · {monthLabel}</span>
          {de ? "Die Events dieses Monats" : "This month's events"}
        </h2>
        <Link to="/calendar" className="btn btn-outline">{de ? "Kalender öffnen" : "View calendar"}</Link>
      </div>

      {lineup.length === 0 ? (
        <EmptyState>
          <p>{de ? "Gerade ist nichts an der Leine. Schau bald wieder vorbei." : "Nothing on the line right now. Check back soon."}</p>
          <Link to="/calendar" className="btn btn-primary">{de ? "Zum Kalender" : "Go to the calendar"}</Link>
        </EmptyState>
      ) : (
        <div className="ev-line" role="list" aria-label={de ? `Events im ${monthLabel} in Reihenfolge` : `${monthLabel} events in order`}>
          <svg className="ev-string" viewBox="0 0 1200 34" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path d="M 0 15 Q 75 30 150 14 Q 300 30 450 14 Q 600 30 750 14 Q 900 30 1050 14 Q 1125 30 1200 15" />
          </svg>
          {lineup.map(({ event, date }, index) => {
            const isNext = index === 0;
            const tiltPreset = PHOTO_TILTS[index % PHOTO_TILTS.length];
            const photo = eventPhoto(event);
            return (
              <div
                key={event.slug}
                className={`ev-photo${isNext ? " is-next" : ""}`}
                role="listitem"
                style={{ "--rot": tiltPreset.rot, "--drop": tiltPreset.drop } as CSSProperties}
              >
                {isNext ? <span className="ev-ribbon">{de ? "Als Nächstes" : "Next up"}</span> : null}
                <span className="ev-clip" aria-hidden="true" />
                <Link className="ev-photo-link" to={`/events/${event.slug}`}>
                  {photo ? <img src={photo} alt="" loading="lazy" /> : null}
                  <span className="ev-caption">
                    <time className="ev-date" dateTime={event.startsAt ?? undefined}>
                      {formatStationTime(date, locale)}
                    </time>
                    <strong className="ev-name">{event.title.full}</strong>
                  </span>
                </Link>
                <button
                  type="button"
                  className="ev-save"
                  aria-label={de ? `${event.title.full} im Kalender speichern` : `Save ${event.title.full} to calendar`}
                  title={de ? "Termin speichern" : "Save the date"}
                  onClick={() => downloadEventIcs(event)}
                >
                  <i className="bi bi-calendar-plus" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** About copy on a parchment letter emerging from an opened airmail envelope.
 *  Reveal is fail-safe: scroll check, IntersectionObserver, and a 2.6s timer,
 *  whichever fires first; reduced motion shortens transitions, never hides. */
export function LetterScene({ de }: { de: boolean }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLSpanElement>(null);
  const letterRef = useRef<HTMLDivElement>(null);
  const sealRef = useRef<HTMLSpanElement>(null);
  const [phone, setPhone] = useState(() => window.matchMedia("(max-width: 560px)").matches);
  const [letterOpen, setLetterOpen] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 560px)");
    const onChange = () => setPhone(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!letterOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLetterOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [letterOpen]);

  useEffect(() => {
    const env = sceneRef.current;
    const flap = flapRef.current;
    const letter = letterRef.current;
    const seal = sealRef.current;
    if (!env || !flap || !letter) return;
    // On a phone the letter is a teaser: the envelope simply sits open.
    // Same once it has already revealed itself earlier this session.
    if (phone || letterRevealedOnce) {
      flap.style.transition = "none";
      flap.style.transform = "rotateX(0deg)";
      flap.style.zIndex = "0";
      if (seal) seal.style.opacity = "0";
      letter.style.transition = "none";
      letter.style.transform = "translateY(0px)";
      return;
    }
    flap.style.transition = "";
    letter.style.transition = "";
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let opened = false;

    let safety: number | undefined;

    // On pages where the scene is visible at load (About us), every trigger
    // fires immediately and the envelope is open before anyone looks at it.
    // Hold the reveal briefly so the sealed envelope is seen opening.
    // The hold is a pause, not motion, so it stays under reduced motion too.
    const mountedAt = Date.now();
    const minDelay = 950;

    const open = () => {
      if (opened) return;
      const elapsed = Date.now() - mountedAt;
      if (elapsed < minDelay) {
        window.setTimeout(open, minDelay - elapsed);
        return;
      }
      opened = true;
      letterRevealedOnce = true;
      if (safety !== undefined) window.clearTimeout(safety);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      flap.style.transform = "rotateX(0deg)";
      if (seal) {
        seal.style.opacity = "0";
        seal.style.transform = "scale(0.7) rotate(-18deg)";
      }
      letter.style.transitionDelay = calm ? "0.2s" : "0.7s";
      letter.style.transitionDuration = calm ? "0.7s" : "1.7s";
      letter.style.transform = "translateY(0px)";
      window.setTimeout(() => {
        flap.style.zIndex = "0";
      }, calm ? 320 : 900);
    };
    // The 2.6s safety is a fail-safe for a scene the user can (almost) see,
    // not a global trigger: arming it at page load would open the envelope
    // while the visitor is still reading the hero.
    const armSafety = () => {
      if (safety === undefined && !opened) safety = window.setTimeout(open, 2600);
    };
    const onScroll = () => {
      const rect = env.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9 && rect.bottom > 0) open();
      else if (rect.top < window.innerHeight * 1.6) armSafety();
    };

    if (calm) flap.style.transitionDuration = "0.55s";
    flap.style.transform = "rotateX(180deg)";
    flap.style.zIndex = "6";
    letter.style.transform = `translateY(${letter.offsetHeight + 8}px)`;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    let io: IntersectionObserver | undefined;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              window.setTimeout(open, 380);
              io?.disconnect();
            }
          });
        },
        { threshold: 0.3 },
      );
      io.observe(env);
    }
    onScroll();
    return () => {
      window.clearTimeout(safety);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      io?.disconnect();
    };
  }, [phone]);

  const paragraphs = de
    ? [
        <p key="p1">
          INCAS steht für <strong>Intercultural Centre of Aachen Students</strong>. Wir sind
          eine studentische Organisation, finanziell und logistisch unterstützt vom
          International Office der RWTH Aachen und der FH Aachen. INCAS richtet sich vor allem
          an internationale Studierende, die in Aachen studieren, ein Praktikum machen oder
          einen Deutschkurs besuchen.
        </p>,
        <p key="p2">
          Das internationale INCAS Team besteht aus ausländischen und deutschen Studierenden.
          Unser Ziel ist eine kulturelle Brücke zwischen Studierenden aus allen Ländern: wir
          fördern Integration und interkulturellen Austausch und helfen internationalen
          Studierenden, ihren Aufenthalt in Aachen so angenehm wie möglich zu machen.
        </p>,
      ]
    : [
        <p key="p1">
          INCAS stands for <strong>Intercultural Centre of Aachen Students</strong>. We are a
          student organisation, financially and logistically supported by the International
          Office of RWTH Aachen and FH Aachen. INCAS mainly serves international students
          studying at universities, doing an internship or taking a German class in Aachen.
        </p>,
        <p key="p2">
          The INCAS international team consists of foreign and German students. Our goal is to
          build a cultural bridge between students from all countries by promoting their
          integration and the intercultural communication among them. We support foreign
          students in making their stay in Aachen as pleasant as possible, providing the help
          and information they need.
        </p>,
      ];

  return (
    <div className="letter-scene" ref={sceneRef}>
      <span className="postcard-bg" aria-hidden="true" />
      <div className="letter-slot">
        <div className="about-body" ref={letterRef}>
          {phone ? paragraphs[0] : paragraphs}
          {phone ? (
            <button type="button" className="letter-more" onClick={() => setLetterOpen(true)}>
              {de ? "Weiterlesen" : "Read the rest"}
            </button>
          ) : null}
        </div>
      </div>
      {phone && letterOpen
        ? createPortal(
            <>
              <div className="lt-scrim is-on" onClick={() => setLetterOpen(false)} />
              <div className="theme-parchment lt-sheet is-on" role="dialog" aria-modal="true" aria-label={de ? "Über INCAS" : "About INCAS"}>
                <button type="button" className="lt-close" aria-label={de ? "Schließen" : "Close"} onClick={() => setLetterOpen(false)}>
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
                {paragraphs}
                <p className="lt-sign">{de ? "Herzlich," : "Yours,"}<b>{de ? "das INCAS Team" : "the INCAS team"}</b></p>
              </div>
            </>,
            document.body,
          )
        : null}
      <div className="envelope" aria-hidden="true">
        <span className="env-side l" />
        <span className="env-side r" />
      </div>
      <span className="env-flap" aria-hidden="true" ref={flapRef} />
      <div className="env-front" aria-hidden="true">
        <span className="env-pocket" />
        <span className="env-airmail">
          <b>AIR MAIL</b>
          <i>PAR AVION</i>
        </span>
        <img className="env-postmark" src={assetUrl("img/playful/postmark.svg") ?? ""} alt="" />
      </div>
      <span className="env-seal" aria-hidden="true" ref={sealRef}>
        INCAS
      </span>
    </div>
  );
}

function NoteArrow() {
  return (
    <svg className="note-arrow" viewBox="0 0 90 46" aria-hidden="true" focusable="false">
      <path d="M6 6 C 32 2, 60 14, 82 34" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M72 33 L 84 35 L 79 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** N° 02: scrapbook team spread with taped photo and hand-drawn notes. */
function TeamSpread({ locale }: { locale: string }) {
  const de = locale === "de";
  const photo = assetUrl("img/site/team-photo.jpg");
  const logo = assetUrl("img/incas-logo.png");
  return (
    <section className="team-section landing-band" id="team" aria-label={de ? "Über INCAS" : "About INCAS"}>
      <span className="postcard-stamp" aria-hidden="true" style={{ bottom: 64, right: "7%", width: 92, transform: "rotate(6deg)" }}>
        <img src={assetUrl("img/playful/stamp-globe.svg") ?? ""} alt="" />
      </span>
      <div className="landing-section-head">
        <h2 style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
          <span className="section-no" aria-hidden="true" style={{ flexBasis: "100%" }}>
            N° 02 · {de ? "Wer wir sind" : "Who we are"}
          </span>
          {de ? "Was ist " : "What is "}
          {logo ? <img src={logo} alt="INCAS" style={{ height: "1em", width: "auto", transform: "translateY(0.12em)" }} /> : "INCAS"}?
        </h2>
        <Link to="/about/team" className="btn btn-outline">{de ? "Das ganze Team" : "Meet the whole team"}</Link>
      </div>
      <p className="about-lead about-lead-center">
        {de
          ? "Wir bringen Kulturen zusammen, damit sich in Aachen niemand weit weg von zu Hause fühlt."
          : "We bring cultures together, so nobody in Aachen feels far from home."}
      </p>
      <div className="team-spread">
        <div className="team-notes team-notes-left">
          <div className="team-note">
            <span>{de ? "Komplett ehrenamtlich organisiert" : "Run entirely by volunteers"}</span>
            <NoteArrow />
          </div>
          <div className="team-note note-up">
            <NoteArrow />
            <span>{de ? "Kein Beitrag, keine Bewerbung" : "No fee, no application"}</span>
          </div>
        </div>
        <div className="team-photo-wrap">
          {photo ? <img src={photo} alt={de ? "Das INCAS Team" : "The INCAS team"} /> : null}
          <span className="team-tape tl" aria-hidden="true" />
          <span className="team-tape br" aria-hidden="true" />
          <span className="team-scribble">{de ? "die INCAS Crew, Dienstagabend" : "the INCAS crew, Tuesday night"}</span>
        </div>
        <div className="team-notes team-notes-right" style={{ position: "relative" }}>
          <div className="team-note"><NoteArrow /></div>
          <div className="team-note note-up"><NoteArrow /></div>
          <span className="team-note-float" style={{ left: 105, top: 28 }}>
            {de ? "Dienstags, 19 Uhr im Humboldt-Haus" : "Tuesdays, 7:00 PM at Humboldt-Haus"}
          </span>
          <span className="team-note-float" style={{ left: 81, top: 203 }}>
            {de ? "Alle sind willkommen, keine Einladung nötig" : "Everyone is welcome, no invite needed"}
          </span>
        </div>
      </div>
      <LetterScene de={de} />
    </section>
  );
}

/** N° 03: find us at Humboldt-Haus. */
function FindUs({ locale }: { locale: string }) {
  const de = locale === "de";
  return (
    <section className="find-us landing-plain" aria-label={de ? "Wo ihr uns findet" : "Where to find us"}>
      <span className="postcard-stamp" aria-hidden="true" style={{ top: 24, right: "2.5%", width: 96, transform: "rotate(-5deg)" }}>
        <img src={assetUrl("img/playful/stamp-arch.svg") ?? ""} alt="" />
      </span>
      <span className="postcard-stamp" aria-hidden="true" style={{ top: 52, right: "calc(2.5% + 68px)", width: 150, transform: "rotate(-9deg)" }}>
        <img src={assetUrl("img/playful/postmark.svg") ?? ""} alt="" />
      </span>
      <div>
        <span className="footer-coords" aria-hidden="true">N° 03 · 50°46′ N · 6°05′ E</span>
        <h2>{de ? "Ihr findet uns im Humboldt-Haus" : "Find us at Humboldt-Haus"}</h2>
        <address>
          Humboldt-Haus<br />Pontstraße 41<br />52062 Aachen
        </address>
        <div className="btn-row">
          <a
            href="https://www.openstreetmap.org/?mlat=50.7787&mlon=6.0800#map=18/50.7787/6.0800"
            className="btn btn-outline btn-sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="bi bi-geo-alt" aria-hidden="true" /> {de ? "In Karten öffnen" : "Open in maps"}
          </a>
          <Link to="/calendar" className="btn btn-outline btn-sm">{de ? "Was dort läuft" : "What's on there"}</Link>
        </div>
      </div>
      <img
        src={assetUrl("img/playful/humboldt-haus-flat.svg") ?? ""}
        alt={de ? "Illustration des Humboldt-Hauses: ein oranges Gebäude mit steinernem Torbogen an der Pontstraße" : "Illustration of Humboldt-Haus: an orange building with a stone arch portal on Pontstraße"}
      />
    </section>
  );
}

const INSTA_TILES = [
  "img/site/cafe-lingua.webp",
  "img/site/country-evening.webp",
  "img/site/international-breakfast.webp",
  "img/site/international-weekend.webp",
];

/** N° 04: socials. */
function SocialBand({ locale }: { locale: string }) {
  const de = locale === "de";
  return (
    <div className="social-band landing-band">
      <span className="footer-coords" aria-hidden="true">N° 04 · 50°46′ N · 6°05′ E</span>
      <h2>{de ? "Folge uns" : "Follow us"}</h2>
      <p>
        {de
          ? "Eventfotos, Ankündigungen und die Karte des nächsten Monats, bevor sie hier gezeichnet wird."
          : "Event photos, announcements, and next month's chart before it's drawn here."}
      </p>
      <div className="insta-grid">
        {INSTA_TILES.map((tile) => {
          const src = assetUrl(tile);
          return (
            <a key={tile} href="https://www.instagram.com/incas_aachen/" className="insta-tile" target="_blank" rel="noopener noreferrer">
              {src ? <img src={src} alt="" loading="lazy" /> : null}
              <span className="sr-only">Instagram</span>
            </a>
          );
        })}
      </div>
      <div className="btn-row">
        <a href="https://www.instagram.com/incas_aachen/" className="btn btn-outline" target="_blank" rel="noopener noreferrer">
          <i className="bi bi-instagram" aria-hidden="true" /> Instagram
        </a>
        <a href="https://www.facebook.com/INCASAachen/" className="btn btn-outline" target="_blank" rel="noopener noreferrer">
          <i className="bi bi-facebook" aria-hidden="true" /> Facebook
        </a>
      </div>
    </div>
  );
}

function PlayfulLanding({ data, locale }: { data: PublicPostsResponse; locale: string }) {
  const de = locale === "de";
  return (
    <>
      <header className="landing-hero">
        <HeroMap />
        <div className="landing-hero-text">
          <p className="hero-coords">50°46′ N · 6°05′ E · Aachen</p>
          <h1>
            {de ? (
              <>Triff die Welt <em>in Aachen</em></>
            ) : (
              <>Meet the world <em>in Aachen</em></>
            )}
          </h1>
          <p className="landing-hero-sub">
            {de
              ? "Lerne Kulturen aus der ganzen Welt kennen und finde dabei eine Gemeinschaft."
              : "Get to know cultures from all over the world, and find a community while you do it."}
          </p>
          <div className="landing-hero-cta">
            <Link to="/events" className="btn btn-primary">{de ? "Events entdecken →" : "Discover events →"}</Link>
          </div>
        </div>
        <HeroGlobe de={de} />
      </header>
      <EventsString events={data.events} locale={locale} />
      <TeamSpread locale={locale} />
      <FindUs locale={locale} />
      <SocialBand locale={locale} />
    </>
  );
}

/* ---------- alternate landing variants (theme registry) ---------- */

function EditorialLanding({ data, locale }: { data: PublicPostsResponse; locale: string }) {
  const de = locale === "de";
  const lead = data.events[0];
  const leadImage = assetUrl(lead?.imageUrl);
  return <><header className="editorial-lead"><p className="page-kicker">INCAS / Aachen</p><h1>{de ? "Begegnungen, die Aachen international machen." : "Encounters that make Aachen international."}</h1><p>{de ? "Das öffentliche Programm der studentischen INCAS Teams." : "The public programme organized by INCAS student teams."}</p></header>{lead ? <Link to={`/events/${lead.slug}`} className="editorial-feature"><div>{lead.startsAt ? <EventDate start={lead.startsAt} locale={locale} /> : null}<EventTitle title={lead.title} as="h2" /><p>{lead.summary}</p></div>{leadImage ? <img src={leadImage} alt="" /> : null}</Link> : null}<div className="editorial-stream">{data.events.slice(1, 8).map((event) => <Link key={event.slug} to={`/events/${event.slug}`}><EventMarker eventKind={event.eventKind} />{event.startsAt ? <EventDate start={event.startsAt} locale={locale} /> : null}<EventTitle title={event.title} /></Link>)}</div><News posts={data.posts} locale={locale} /><AboutAndOffers /></>;
}

function EventFirstLanding({ data, locale }: { data: PublicPostsResponse; locale: string }) {
  const de = locale === "de";
  const [next, ...rest] = data.events;
  return <><div className="eventfirst-head"><div><p className="page-kicker">INCAS Aachen</p><h1>{de ? "Was als Nächstes passiert" : "What's happening next"}</h1></div><Link to="/calendar" className="btn btn-outline">{de ? "Ganzer Kalender" : "Full calendar"}</Link></div>{next ? <EventCard event={next} locale={locale} /> : <EmptyState>{de ? "Keine bevorstehenden Events." : "No upcoming events."}</EmptyState>}<Upcoming events={rest} locale={locale} limit={5} /><AboutAndOffers /><News posts={data.posts} locale={locale} /></>;
}

function PortalLanding({ data, locale }: { data: PublicPostsResponse; locale: string }) {
  const { site } = useLocale();
  const de = locale === "de";
  return <><header className="portal-intro"><p className="page-kicker">INCAS Aachen</p><h1>{de ? "Finde dein nächstes INCAS Angebot" : "Find your next INCAS activity"}</h1></header><div className="portal-offers">{site?.offers.pages.map((offer) => <Link key={offer.to} to={offer.to}><EventIcon icon={offer.icon} /><strong>{offer.title}</strong><span>{offer.description}</span></Link>)}</div><Upcoming events={data.events} locale={locale} limit={4} /><News posts={data.posts} locale={locale} /></>;
}

export function LandingPage() {
  const data = useData();
  const { locale } = useLocale();
  const { theme, isPreview, loading: themeLoading } = usePublicTheme("landing");
  const posts = useAsync(() => data.getPublicPosts(), [data]);
  const [showArchive, setShowArchive] = useState(false);
  if (posts.loading || themeLoading) return <Loading />;
  if (posts.error || !posts.data) return <ErrorState error={posts.error} onRetry={posts.reload} />;
  const content = posts.data;
  return <>{isPreview ? <p className="notice notice-info">{locale === "de" ? "Theme-Vorschau" : "Theme preview"}: <strong>{theme}</strong>.</p> : null}{theme === "editorial" ? <EditorialLanding data={content} locale={locale} /> : theme === "event-first" ? <EventFirstLanding data={content} locale={locale} /> : theme === "portal" ? <PortalLanding data={content} locale={locale} /> : <PlayfulLanding data={content} locale={locale} />}{content.archivedEvents.length ? <section className="landing-archive"><button type="button" className="btn btn-ghost" onClick={() => setShowArchive((value) => !value)} aria-expanded={showArchive}>{showArchive ? (locale === "de" ? "Vergangene Events ausblenden" : "Hide past events") : (locale === "de" ? "Vergangene Events anzeigen" : "Show past events")}</button>{showArchive ? <div className="event-grid">{content.archivedEvents.slice(0, 6).map((event) => <EventCard key={event.slug} event={event} locale={locale} compact />)}</div> : null}</section> : null}</>;
}
