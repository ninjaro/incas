import { useState } from "react";
import { Link } from "react-router-dom";

import type { PublicPost } from "../api/types";
import { EmptyState, ErrorState, Loading, PageHeader } from "../components/ui";
import { useData } from "../data/DataProviderContext";
import { usePublicTheme } from "../features/themes/usePublicTheme";
import { useAsync } from "../hooks/useAsync";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString("en", { month: "long", year: "numeric" });
}

function MonthGrid({ year, month, events }: { year: number; month: number; events: PublicPost[] }) {
  const first = new Date(year, month - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();

  const cells: { day: number | null; events: PublicPost[] }[] = [];
  for (let index = 0; index < offset; index += 1) cells.push({ day: null, events: [] });
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      day,
      events: events.filter((event) => event.startsAt && new Date(event.startsAt).getDate() === day),
    });
  }

  return (
    <div>
      <div className="cal-grid" role="presentation">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="cal-grid-head">
            {weekday}
          </div>
        ))}
        {cells.map((cell, index) => (
          <div
            key={index}
            className={`cal-cell${cell.day === null ? " is-outside" : ""}${
              cell.day === today.getDate() &&
              month === today.getMonth() + 1 &&
              year === today.getFullYear()
                ? " is-today"
                : ""
            }`}
          >
            {cell.day}
            {cell.events.map((event) => (
              <Link key={event.slug} to={`/events/${event.slug}`} className="cal-chip">
                {event.title.full}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function AgendaList({ events }: { events: PublicPost[] }) {
  if (events.length === 0) return <EmptyState>No events this month.</EmptyState>;
  return (
    <div>
      {events.map((event) => (
        <div key={event.slug} className="agenda-item">
          <time>
            {event.startsAt
              ? new Date(event.startsAt).toLocaleString("en", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
          </time>
          <div>
            <Link to={`/events/${event.slug}`}>
              <strong>{event.title.full}</strong>
            </Link>
            <p style={{ margin: "2px 0 0", color: "var(--ink-soft)" }}>{event.summary}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineList({ events }: { events: PublicPost[] }) {
  if (events.length === 0) return <EmptyState>No events this month.</EmptyState>;
  return (
    <div className="timeline-list">
      {events.map((event) => (
        <div key={event.slug} className="timeline-item">
          <time style={{ color: "var(--incas-orange-deep)", fontWeight: 700 }}>
            {event.startsAt
              ? new Date(event.startsAt).toLocaleString("en", { day: "numeric", month: "long" })
              : ""}
          </time>
          <h3 style={{ margin: "2px 0" }}>
            <Link to={`/events/${event.slug}`}>{event.title.full}</Link>
          </h3>
          <p style={{ margin: 0, color: "var(--ink-soft)" }}>{event.summary}</p>
        </div>
      ))}
    </div>
  );
}

export function CalendarPage() {
  const data = useData();
  const { theme, isPreview } = usePublicTheme("calendar");
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const calendar = useAsync(
    () => data.getCalendar(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );

  const shift = (delta: number) => {
    setCursor(({ year, month }) => {
      const date = new Date(year, month - 1 + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() + 1 };
    });
  };

  return (
    <>
      <PageHeader kicker="What's on" title="Calendar" />
      {isPreview ? (
        <p className="notice notice-info">
          Theme preview: <strong>{theme}</strong>.
        </p>
      ) : null}
      <div className="cal-controls">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => shift(-1)}>
          ← Previous
        </button>
        <h2>{monthLabel(cursor.year, cursor.month)}</h2>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => shift(1)}>
          Next →
        </button>
      </div>
      {calendar.loading ? (
        <Loading />
      ) : calendar.error ? (
        <ErrorState error={calendar.error} onRetry={calendar.reload} />
      ) : theme === "agenda" ? (
        <AgendaList events={calendar.data?.events ?? []} />
      ) : theme === "timeline" ? (
        <TimelineList events={calendar.data?.events ?? []} />
      ) : (
        <MonthGrid
          year={cursor.year}
          month={cursor.month}
          events={calendar.data?.events ?? []}
        />
      )}
    </>
  );
}
