import { Link } from "react-router-dom";

import type { PublicPost } from "../api/types";
import { EmptyState, ErrorState, Loading } from "../components/ui";
import { useData } from "../data/DataProviderContext";
import { usePublicTheme } from "../features/themes/usePublicTheme";
import { useAsync } from "../hooks/useAsync";

function formatEventDate(iso: string | null): { day: string; month: string; label: string } {
  if (!iso) return { day: "", month: "", label: "" };
  const date = new Date(iso);
  return {
    day: String(date.getDate()),
    month: date.toLocaleString("en", { month: "short" }),
    label: date.toLocaleString("en", {
      weekday: "short",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function EventCard({ event }: { event: PublicPost }) {
  const date = formatEventDate(event.startsAt);
  return (
    <Link to={`/events/${event.slug}`} className="event-card">
      <div
        className="event-card-media"
        style={event.imageUrl ? { backgroundImage: `url(${event.imageUrl})` } : undefined}
      >
        {date.day ? (
          <span className="event-card-date">
            <strong>{date.day}</strong>
            <span>{date.month}</span>
          </span>
        ) : null}
      </div>
      <div className="event-card-body">
        <h3>{event.title.full}</h3>
        <p>{event.summary || "Tap to see all the details."}</p>
      </div>
    </Link>
  );
}

function EventsSection({ events }: { events: PublicPost[] }) {
  return (
    <section className="landing-section" aria-label="Upcoming events">
      <div className="landing-section-head">
        <h2>Upcoming Events</h2>
        <Link to="/calendar" className="btn btn-outline">
          View calendar
        </Link>
      </div>
      {events.length === 0 ? (
        <EmptyState>
          <p>No upcoming events are scheduled right now — check the calendar.</p>
          <Link to="/calendar" className="btn btn-primary">
            Go to the calendar
          </Link>
        </EmptyState>
      ) : (
        <div className="event-grid">
          {events.slice(0, 6).map((event) => (
            <EventCard key={event.slug} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}

function HeroLanding({ events }: { events: PublicPost[] }) {
  return (
    <>
      <section className="landing-hero">
        <h1>
          Meet the world <em>in Aachen</em>
        </h1>
        <p>
          INCAS connects international and local students through country evenings, language
          exchange, trips, and shared breakfasts — every week, open to everyone.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/calendar" className="btn btn-primary">
            Discover events
          </Link>
          <Link to="/team" className="btn btn-outline">
            Meet the team
          </Link>
        </div>
      </section>
      <EventsSection events={events} />
    </>
  );
}

function EditorialLanding({ events }: { events: PublicPost[] }) {
  return (
    <>
      <div className="editorial-lead">
        <p className="page-kicker">Intercultural Centre of Aachen Students</p>
        <h1>
          A weekly program that turns strangers into <em>friends</em>.
        </h1>
        <p>
          Country evenings, café lingua, board games, international breakfasts, and weekend trips —
          organized by students, for students, since day one.
        </p>
      </div>
      <hr className="editorial-rule" />
      <section aria-label="Upcoming events">
        {events.length === 0 ? (
          <EmptyState>No upcoming events are scheduled right now.</EmptyState>
        ) : (
          events.slice(0, 8).map((event) => {
            const date = formatEventDate(event.startsAt);
            return (
              <Link key={event.slug} to={`/events/${event.slug}`} className="editorial-event">
                <time>
                  {date.day} {date.month}
                </time>
                <div>
                  <h3>{event.title.full}</h3>
                  <p>{event.summary}</p>
                </div>
                <span aria-hidden="true">→</span>
              </Link>
            );
          })
        )}
      </section>
    </>
  );
}

function EventFirstLanding({ events }: { events: PublicPost[] }) {
  const [next, ...rest] = events;
  return (
    <>
      <div className="eventfirst-head">
        <h1>What&apos;s on at INCAS</h1>
        <Link to="/calendar" className="btn btn-outline">
          Full calendar
        </Link>
      </div>
      {next ? (
        <Link to={`/events/${next.slug}`} className="eventfirst-next">
          <span>Next event · {formatEventDate(next.startsAt).label}</span>
          <strong>{next.title.full}</strong>
          <p style={{ margin: 0 }}>{next.summary}</p>
        </Link>
      ) : (
        <EmptyState>No upcoming events are scheduled right now.</EmptyState>
      )}
      <EventsSection events={rest} />
    </>
  );
}

export function LandingPage() {
  const data = useData();
  const { theme, isPreview, loading: themeLoading } = usePublicTheme("landing");
  const posts = useAsync(() => data.getPublicPosts(), []);

  if (posts.loading || themeLoading) return <Loading />;
  if (posts.error) return <ErrorState error={posts.error} onRetry={posts.reload} />;

  const events = posts.data?.events ?? [];

  return (
    <>
      {isPreview ? (
        <p className="notice notice-info">
          Theme preview: <strong>{theme}</strong>. Visitors still see the public theme.
        </p>
      ) : null}
      {theme === "editorial" ? (
        <EditorialLanding events={events} />
      ) : theme === "event-first" ? (
        <EventFirstLanding events={events} />
      ) : (
        <HeroLanding events={events} />
      )}
    </>
  );
}
