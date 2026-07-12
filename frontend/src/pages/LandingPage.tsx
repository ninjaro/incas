import { useState } from "react";
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

function HeroLanding({ data, locale }: { data: PublicPostsResponse; locale: string }) {
  const de = locale === "de";
  return <><section className="landing-hero"><div><p className="page-kicker">Intercultural Centre of Aachen Students</p><h1>{de ? "Menschen in Aachen zusammenbringen" : "Bringing people together in Aachen"}</h1><p>{de ? "Offene Events, Sprachaustausch und Ausflüge von Studierenden für Studierende." : "Open events, language exchange and trips organized by students for students."}</p><div className="hero-actions"><Link to="/calendar" className="btn btn-primary">{de ? "Events entdecken" : "Discover events"}</Link><Link to="/about" className="btn btn-outline">{de ? "Über uns" : "About us"}</Link></div></div><a href="#upcoming-title" className="scroll-indicator">{de ? "Weiter" : "Scroll"}<span aria-hidden="true">v</span></a></section><Upcoming events={data.events} locale={locale} /><News posts={data.posts} locale={locale} /><AboutAndOffers /></>;
}

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
  return <>{isPreview ? <p className="notice notice-info">{locale === "de" ? "Theme-Vorschau" : "Theme preview"}: <strong>{theme}</strong>.</p> : null}{theme === "editorial" ? <EditorialLanding data={content} locale={locale} /> : theme === "event-first" ? <EventFirstLanding data={content} locale={locale} /> : theme === "portal" ? <PortalLanding data={content} locale={locale} /> : <HeroLanding data={content} locale={locale} />}{content.archivedEvents.length ? <section className="landing-archive"><button type="button" className="btn btn-ghost" onClick={() => setShowArchive((value) => !value)} aria-expanded={showArchive}>{showArchive ? (locale === "de" ? "Vergangene Events ausblenden" : "Hide past events") : (locale === "de" ? "Vergangene Events anzeigen" : "Show past events")}</button>{showArchive ? <div className="event-grid">{content.archivedEvents.slice(0, 6).map((event) => <EventCard key={event.slug} event={event} locale={locale} compact />)}</div> : null}</section> : null}</>;
}
