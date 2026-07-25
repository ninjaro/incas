import { useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";

import type { PublicPost, PublicPostsResponse } from "../api/types";
import { EventCard, EventDate, EventIcon, EventMarker, EventTitle, PinnedBadge } from "../components/events";
import { EmptyState, ErrorState, Loading } from "../components/ui";
import { useData } from "../data/DataProviderContext";
import { usePublicTheme } from "../features/themes/usePublicTheme";
import { useAsync } from "../hooks/useAsync";
import { useLocale } from "../i18n/LocaleContext";
import { assetUrl } from "../utils/assets";

function PostCard({ post, de }: { post: PublicPost; de: boolean }) {
  return <article className="post-card">{post.isPinned ? <PinnedBadge locale={de ? "de" : "en"} /> : null}<h3><Link to={`/events/${post.slug}`}>{post.title.full}</Link></h3><p>{post.summary}</p><Link to={`/events/${post.slug}`}>{de ? "Weiterlesen" : "Read more"}</Link></article>;
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

/* ---------- treasure-map landing (Parchment Daylight, design system) ---------- */

const MAP_INK = "#6f5226";
const MAP_W = 1200;
const MAP_H = 680;

type StationSlot = { x: number; y: number; label: "above" | "below" };

/* One layout per event count (index = count - 1) so the route always spans
   the full map. Slots keep clear of the cartouche (top-left), the month stamp
   (bottom-right), and each other's plaques. */
const STATION_LAYOUTS: StationSlot[][] = [
  [{ x: 640, y: 470, label: "above" }],
  [
    { x: 260, y: 540, label: "above" },
    { x: 1000, y: 420, label: "below" },
  ],
  [
    { x: 180, y: 565, label: "above" },
    { x: 640, y: 430, label: "below" },
    { x: 1050, y: 555, label: "above" },
  ],
  [
    { x: 150, y: 565, label: "above" },
    { x: 520, y: 420, label: "below" },
    { x: 810, y: 575, label: "above" },
    { x: 1050, y: 295, label: "below" },
  ],
  [
    { x: 150, y: 565, label: "above" },
    { x: 460, y: 420, label: "below" },
    { x: 700, y: 565, label: "above" },
    { x: 880, y: 300, label: "below" },
    { x: 1075, y: 570, label: "above" },
  ],
  [
    { x: 150, y: 565, label: "above" },
    { x: 440, y: 430, label: "below" },
    { x: 640, y: 565, label: "above" },
    { x: 845, y: 300, label: "below" },
    { x: 1010, y: 590, label: "above" },
    { x: 1100, y: 295, label: "below" },
  ],
];

function routePath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const midX = (prev.x + cur.x) / 2;
    d += ` C ${midX} ${prev.y}, ${midX} ${cur.y}, ${cur.x} ${cur.y}`;
  }
  return d;
}

function TreasureBackdrop({ de }: { de: boolean }) {
  // Hand-drawn chart furniture per the design reference: landmasses,
  // mountains, sea arcs, the dashed "exam phase" ring, skull, compass.
  return (
    <svg
      className="treasure-backdrop"
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id="parchment-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      <g fill="rgba(155, 110, 55, 0.16)" stroke="rgba(122, 90, 46, 0.5)" strokeWidth="2">
        <path d="M -30 60 C 120 20, 300 60, 330 170 C 350 250, 260 290, 210 350 C 160 410, 60 400, -30 440 Z" />
        <path d="M 430 560 C 480 520, 560 530, 590 570 C 620 610, 560 650, 500 645 C 450 640, 400 600, 430 560 Z" />
        <path d="M 1230 180 C 1120 200, 1060 260, 1090 330 C 1115 390, 1200 400, 1230 460 Z" />
        <path d="M 640 30 C 700 10, 762 32, 752 72 C 742 108, 662 108, 642 72 Z" />
      </g>

      <g stroke="rgba(122, 90, 46, 0.55)" strokeWidth="1.5" fill="none" strokeLinejoin="round">
        <path d="M 110 300 l 14 -18 l 14 18 m 12 0 l 14 -18 l 14 18 m 12 0 l 14 -18 l 14 18" />
        <path d="M 130 330 l 14 -18 l 14 18 m 12 0 l 14 -18 l 14 18" />
      </g>

      <g stroke="rgba(122, 90, 46, 0.3)" strokeWidth="1.5" fill="none">
        <circle cx={1250} cy={740} r={250} />
        <circle cx={1250} cy={740} r={320} />
        <circle cx={1250} cy={740} r={390} />
      </g>

      <g>
        <circle
          cx={640}
          cy={170}
          r={85}
          fill="none"
          stroke="rgba(122, 90, 46, 0.5)"
          strokeWidth="1.5"
          strokeDasharray="7 7"
        />
        <text
          x={640}
          y={176}
          textAnchor="middle"
          fill="rgba(105, 75, 35, 0.7)"
          fontFamily="Playfair Display, Georgia, serif"
          fontStyle="italic"
          fontSize="17"
        >
          {de ? "Klausurenphase" : "exam phase"}
        </text>
      </g>

      <g transform="translate(60 618)" stroke={MAP_INK} fill="none" opacity="0.75">
        <circle r={11} fill={MAP_INK} stroke="none" />
        <circle cx={-4} cy={-2} r={2} fill="#e2c894" stroke="none" />
        <circle cx={4} cy={-2} r={2} fill="#e2c894" stroke="none" />
        <path d="M -16 18 L 16 32 M 16 18 L -16 32" strokeWidth="5" strokeLinecap="round" />
      </g>

      <g transform="translate(1092 108)" stroke={MAP_INK} fill="none" opacity="0.8">
        <circle r={62} strokeWidth="1.2" opacity="0.7" />
        <circle r={10} strokeWidth="1.2" />
        <path d="M -46 0 L -10 5 L 46 0 L -10 -5 Z" fill={MAP_INK} fillOpacity="0.45" stroke="none" />
        <path d="M 0 46 L 5 10 L 0 -20 L -5 10 Z" fill={MAP_INK} fillOpacity="0.45" stroke="none" />
        <path d="M 0 -74 L 7 -8 L 0 9 L -7 -8 Z" fill="#a04f10" fillOpacity="0.9" stroke="none" />
        <circle r={3.5} fill="#a04f10" stroke="none" />
        <text x={0} y={-84} textAnchor="middle" fill={MAP_INK} stroke="none" fontSize="14" fontFamily="ui-monospace, monospace">
          N
        </text>
      </g>

      <rect width={MAP_W} height={MAP_H} filter="url(#parchment-grain)" opacity="0.06" />
    </svg>
  );
}

function formatStationTime(date: Date, locale: string): string {
  const lang = locale === "de" ? "de" : "en";
  const weekday = date.toLocaleString(lang, { weekday: "short" });
  const month = date.toLocaleString(lang, { month: "short" });
  const time = date.toLocaleString(lang, { hour: "numeric", minute: "2-digit", hour12: lang === "en" });
  return `${weekday} · ${month} ${date.getDate()} · ${time}`;
}

function TreasureChart({ events, locale }: { events: PublicPost[]; locale: string }) {
  const de = locale === "de";
  const now = new Date();
  const monthLabel = now.toLocaleString(de ? "de" : "en", { month: "long", year: "numeric" });

  const monthEvents = events
    .filter((event) => event.startsAt)
    .map((event) => ({ event, date: new Date(event.startsAt as string) }))
    .filter(
      ({ date }) => date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth(),
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, STATION_LAYOUTS.length);

  const slots = STATION_LAYOUTS[monthEvents.length - 1] ?? [];

  return (
    <section className="treasure" aria-label={de ? `Events im ${monthLabel}` : `Upcoming events in ${monthLabel}`}>
      <div className="landing-section-head">
        <h2>
          <span className="section-no" aria-hidden="true">
            N° 01 · {monthLabel}
          </span>
          {de ? "Die Expeditionen dieses Monats" : "This month's expeditions"}
        </h2>
        <Link to="/calendar" className="btn btn-outline">
          {de ? "Kalender öffnen" : "View calendar"}
        </Link>
      </div>

      <div className="treasure-sheet-wrap">
        <div className={`treasure-sheet${monthEvents.length >= 5 ? " is-dense" : ""}`}>
          <TreasureBackdrop de={de} />
          {monthEvents.length > 1 ? (
            <svg
              className="treasure-route"
              viewBox={`0 0 ${MAP_W} ${MAP_H}`}
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
            >
              <path className="treasure-route-path" d={routePath(slots)} />
            </svg>
          ) : null}

          <div className="treasure-cartouche">
            <p className="hero-coords">50°46′ N · 6°05′ E · Aachen</p>
            <h1>
              {de ? (
                <>Triff die Welt <em>in Aachen</em></>
              ) : (
                <>Meet the world <em>in Aachen</em></>
              )}
            </h1>
            <p className="treasure-cartouche-sub">
              {de
                ? "Länderabende, Sprachtandem, Ausflüge und gemeinsames Frühstück. Jede Woche, offen für alle."
                : "Country evenings, language tandem, trips, and shared breakfasts. Every week, open to everyone."}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link to="/offers" className="btn btn-primary btn-sm">
                {de ? "Events entdecken →" : "Discover events →"}
              </Link>
              <a href="#team" className="btn btn-outline btn-sm">
                {de ? "Das Team" : "Meet the team"}
              </a>
            </div>
          </div>

          <p className="treasure-month" aria-hidden="true">
            {monthLabel} · {de ? "Expeditionskarte" : "expedition chart"}
          </p>

          {monthEvents.length === 0 ? (
            <div className="treasure-empty">
              <p>
                {de
                  ? `Für ${monthLabel} ist noch keine Expedition eingezeichnet. Die Crew plant den nächsten Kurs.`
                  : `No expeditions charted for ${monthLabel}. The crew is plotting the next course.`}
              </p>
              <Link to="/calendar" className="btn btn-primary">
                {de ? "Zum Kalender" : "Go to the calendar"}
              </Link>
            </div>
          ) : (
            <ol className="treasure-stations">
              {monthEvents.map(({ event, date }, index) => {
                const slot = slots[index];
                return (
                  <li
                    key={event.slug}
                    className={[
                      "treasure-station",
                      index === 0 ? "is-next" : "",
                      slot.label === "above" ? "is-above" : "is-below",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={
                      {
                        left: `${(slot.x / MAP_W) * 100}%`,
                        top: `${(slot.y / MAP_H) * 100}%`,
                        "--station-index": index,
                      } as CSSProperties
                    }
                  >
                    <Link to={`/events/${event.slug}`}>
                      <span className="treasure-x" aria-hidden="true">
                        ✕
                      </span>
                      <span className="treasure-label">
                        {index === 0 ? (
                          <span className="treasure-next">{de ? "Als Nächstes" : "Next up"}</span>
                        ) : null}
                        <time dateTime={event.startsAt ?? undefined}>{formatStationTime(date, locale)}</time>
                        <strong>{event.title.full}</strong>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

function TeamIntroSection({ locale }: { locale: string }) {
  const de = locale === "de";
  const photo = assetUrl("img/site/about-team.webp");
  return (
    <section className="team-section" id="team" aria-label={de ? "Über INCAS" : "About INCAS"}>
      <div className="landing-section-head">
        <h2>
          <span className="section-no" aria-hidden="true">
            N° 02 · {de ? "Wer wir sind" : "Who we are"}
          </span>
          {de ? "Was ist INCAS?" : "What is INCAS?"}
        </h2>
        <Link to="/about/team" className="btn btn-outline">
          {de ? "Das ganze Team" : "Meet the whole team"}
        </Link>
      </div>
      <div className="team-row">
        <div>
          <p className="about-lead">
            {de
              ? "Das Intercultural Centre of Aachen Students: eine studentische Initiative, die die Welt in Aachen zusammenbringt."
              : "The Intercultural Centre of Aachen Students: a student initiative that brings the world together in Aachen."}
          </p>
          <p className="team-blurb">
            {de
              ? "Komplett ehrenamtlich organisiert. Kein Beitrag, keine Bewerbung. Das Team trifft sich dienstags um 19 Uhr im Humboldt-Haus, alle sind willkommen."
              : "Run entirely by volunteers. No fee, no application. The team meets Tuesdays at 7:00 PM at Humboldt-Haus, and everyone is welcome."}
          </p>
        </div>
        <div className="team-photo-wrap">
          {photo ? <img src={photo} alt={de ? "Das INCAS Team" : "The INCAS team"} /> : null}
        </div>
      </div>
    </section>
  );
}

const INSTA_TILES = [
  "img/site/cafe-lingua.webp",
  "img/site/country-evening.webp",
  "img/site/international-breakfast.webp",
  "img/site/international-weekend.webp",
];

function SocialBand({ locale }: { locale: string }) {
  const de = locale === "de";
  return (
    <div className="social-band">
      <span className="footer-coords" aria-hidden="true">N° 03 · 50°46′ N · 6°05′ E</span>
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

function TreasureLanding({ data, locale }: { data: PublicPostsResponse; locale: string }) {
  return (
    <>
      <TreasureChart events={data.events} locale={locale} />
      <TeamIntroSection locale={locale} />
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
  return <>{isPreview ? <p className="notice notice-info">{locale === "de" ? "Theme-Vorschau" : "Theme preview"}: <strong>{theme}</strong>.</p> : null}{theme === "editorial" ? <EditorialLanding data={content} locale={locale} /> : theme === "event-first" ? <EventFirstLanding data={content} locale={locale} /> : theme === "portal" ? <PortalLanding data={content} locale={locale} /> : <TreasureLanding data={content} locale={locale} />}{content.archivedEvents.length ? <section className="landing-archive"><button type="button" className="btn btn-ghost" onClick={() => setShowArchive((value) => !value)} aria-expanded={showArchive}>{showArchive ? (locale === "de" ? "Vergangene Events ausblenden" : "Hide past events") : (locale === "de" ? "Vergangene Events anzeigen" : "Show past events")}</button>{showArchive ? <div className="event-grid">{content.archivedEvents.slice(0, 6).map((event) => <EventCard key={event.slug} event={event} locale={locale} compact />)}</div> : null}</section> : null}</>;
}
