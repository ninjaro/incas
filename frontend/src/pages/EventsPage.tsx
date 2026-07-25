import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import type { PublicPost } from "../api/types";
import { EventIcon } from "../components/events";
import { EmptyState, ErrorState, Loading } from "../components/ui";
import { useData } from "../data/DataProviderContext";
import { useAsync } from "../hooks/useAsync";
import { useLocale } from "../i18n/LocaleContext";

type EventsTab = "discover" | "register";

function tabFromHash(hash: string): EventsTab {
  return hash === "#register" ? "register" : "discover";
}

function RegisterRow({ event, locale }: { event: PublicPost; locale: string }) {
  const de = locale === "de";
  const date = event.startsAt ? new Date(event.startsAt) : null;
  const label = date
    ? date.toLocaleString(de ? "de" : "en", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: !de,
      })
    : null;
  return (
    <div className="card events-register-row">
      <div>
        <h3>{event.title.full}</h3>
        {label ? <p className="events-register-when">{label}</p> : null}
        {event.summary ? <p>{event.summary}</p> : null}
      </div>
      <Link to={`/events/${event.slug}`} className="btn btn-primary btn-sm">
        {de ? "Anmelden →" : "Register →"}
      </Link>
    </div>
  );
}

export function EventsPage() {
  const data = useData();
  const { site, locale } = useLocale();
  const de = locale === "de";
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<EventsTab>(() => tabFromHash(location.hash));
  const posts = useAsync(() => data.getPublicPosts(), [data]);

  useEffect(() => {
    setTab(tabFromHash(location.hash));
  }, [location.hash]);

  const selectTab = (next: EventsTab) => {
    setTab(next);
    navigate(`#${next}`, { replace: true });
  };

  return (
    <>
      <header className="page-hero">
        <p className="hero-coords">50°46′ N · 6°05′ E · Aachen</p>
        <h1>
          {de ? (
            <>Unsere <em>Events</em></>
          ) : (
            <>Our <em>events</em></>
          )}
        </h1>
        <p>
          {de
            ? "Alles, was INCAS jede Woche auf die Karte zeichnet: entdecken und direkt anmelden."
            : "Everything INCAS charts every week: discover what's on and register in one place."}
        </p>
      </header>

      <div className="tabs" role="tablist" aria-label={de ? "Events Ansichten" : "Events views"}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "discover"}
          onClick={() => selectTab("discover")}
        >
          {de ? "Events entdecken" : "Discover events"}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "register"}
          onClick={() => selectTab("register")}
        >
          {de ? "Für Events anmelden" : "Register for events"}
        </button>
      </div>

      {tab === "discover" ? (
        <div className="portal-offers events-discover">
          {site?.offers.pages.map((offer) => (
            <Link key={offer.to} to={offer.to}>
              <EventIcon icon={offer.icon} />
              <strong>{offer.title}</strong>
              <span>{offer.description}</span>
            </Link>
          ))}
        </div>
      ) : posts.loading ? (
        <Loading />
      ) : posts.error || !posts.data ? (
        <ErrorState error={posts.error} onRetry={posts.reload} />
      ) : posts.data.events.length ? (
        <div className="events-register-list">
          {posts.data.events.map((event) => (
            <RegisterRow key={event.slug} event={event} locale={locale} />
          ))}
        </div>
      ) : (
        <EmptyState>
          {de
            ? "Aktuell sind keine Events zur Anmeldung offen."
            : "No events are open for registration right now."}
        </EmptyState>
      )}
    </>
  );
}
