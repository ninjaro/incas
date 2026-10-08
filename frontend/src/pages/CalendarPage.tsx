import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";

import type { PublicPost } from "../api/types";
import { EventCard, EventDate, EventMarker, EventPaymentNotice, EventTitle } from "../components/events";
import { EmptyState, ErrorState, Loading } from "../components/ui";
import { downloadEventIcs } from "../utils/ics";
import { useData } from "../data/DataProviderContext";
import { getEventKind } from "../domain/eventKinds";
import { usePublicTheme } from "../features/themes/usePublicTheme";
import { useAsync } from "../hooks/useAsync";
import { useLocale } from "../i18n/LocaleContext";

type DayCell = { date: Date; inMonth: boolean; events: PublicPost[] };

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function eventDateKey(event: PublicPost) {
  return event.startsAt ? dateKey(new Date(event.startsAt)) : "";
}

export function buildCells(year: number, month: number, events: PublicPost[]): DayCell[] {
  const first = new Date(year, month - 1, 1);
  const leading = (first.getDay() + 6) % 7;
  const start = new Date(year, month - 1, 1 - leading);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = dateKey(date);
    return { date, inMonth: date.getMonth() === month - 1, events: events.filter((event) => eventDateKey(event) === key) };
  });
}

export function groupEventsByWeek(events: PublicPost[]) {
  const groups = new Map<string, { start: Date; events: PublicPost[] }>();
  [...events]
    .sort((left, right) => (left.startsAt ?? "").localeCompare(right.startsAt ?? ""))
    .forEach((event) => {
      if (!event.startsAt) return;
      const start = new Date(event.startsAt);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      const key = dateKey(start);
      const group = groups.get(key) ?? { start, events: [] };
      group.events.push(event);
      groups.set(key, group);
    });
  return [...groups.values()];
}

export const CALENDAR_RENDERER_IDS = [
  "month", "public-grid", "agenda", "timeline", "board", "cards", "table",
] as const;

function DayDialog({ cell, locale, onClose }: { cell: DayCell; locale: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const de = locale === "de";
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <section ref={dialogRef} className="dialog calendar-day-dialog" role="dialog" aria-modal="true" aria-labelledby="calendar-day-title" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
        <div className="dialog-title-row"><h2 id="calendar-day-title">{new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(cell.date)}</h2><button ref={closeRef} type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label={de ? "Schließen" : "Close"}>x</button></div>
        {cell.events.map((event) => <div className="calendar-dialog-event" key={event.slug}><EventCard event={event} locale={locale} compact />{event.summary ? <p>{event.summary}</p> : null}<Link to={`/events/${event.slug}`}>{de ? "Eventdetails öffnen" : "Open event details"}</Link></div>)}
      </section>
    </div>
  );
}

/* Design (Calendar.html): colour-coded filter chips above the grid. */
export const CAL_FILTERS: { key: string; label: string; labelDe: string; dot: string; kinds: string[] }[] = [
  { key: "lingua", label: "Café Lingua", labelDe: "Café Lingua", dot: "#55622e", kinds: ["cafe_lingua"] },
  { key: "country", label: "Country Evening", labelDe: "Länderabend", dot: "#ff6600", kinds: ["country_evening"] },
  { key: "karaoke", label: "Karaoke", labelDe: "Karaoke", dot: "#b34700", kinds: ["karaoke"] },
  { key: "games", label: "Board Games", labelDe: "Brettspiele", dot: "#8fa057", kinds: ["board_games"] },
  { key: "breakfast", label: "Breakfast", labelDe: "Frühstück", dot: "#a8761f", kinds: ["breakfast"] },
  { key: "trip", label: "Weekend trip", labelDe: "Wochenendtrip", dot: "#6b7f8f", kinds: ["trip"] },
];

export function filterTypeOf(event: PublicPost): string | null {
  const entry = CAL_FILTERS.find((filter) => filter.kinds.includes(event.eventKind ?? ""));
  return entry ? entry.key : null;
}

function eventHidden(event: PublicPost, active: string[]): boolean {
  if (!active.length) return false;
  const type = filterTypeOf(event);
  return !type || !active.includes(type);
}

function MonthGrid({ year, month, events, locale, minimal = false, activeFilters = [] }: { year: number; month: number; events: PublicPost[]; locale: string; minimal?: boolean; activeFilters?: string[] }) {
  const [selected, setSelected] = useState<DayCell | null>(null);
  const cells = buildCells(year, month, events);
  const weekdays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2026, 0, 5 + index)));
  const today = dateKey(new Date());
  return (
    <>
      <div className={`cal-grid${minimal ? " is-public-grid" : ""}`} role="grid" aria-label={new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1))}>
        <div className="cal-grid-row" role="row">
          {weekdays.map((weekday) => <div key={weekday} className="cal-grid-head" role="columnheader">{weekday}</div>)}
        </div>
        {Array.from({ length: 6 }, (_, week) => <div className="cal-grid-row" role="row" key={week}>{cells.slice(week * 7, week * 7 + 7).map((cell) => {
          const hasEvents = cell.events.length > 0;
          const isToday = dateKey(cell.date) === today;
          const weekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
          const eventState = hasEvents ? (cell.events.some((event) => event.isLive) ? " has-upcoming" : " has-archived") : "";
          const allHidden = hasEvents && cell.events.every((event) => eventHidden(event, activeFilters));
          const classes = `cal-cell${cell.inMonth ? "" : " is-outside"}${weekend ? " is-weekend" : ""}${isToday ? " is-today" : ""}${hasEvents ? " has-events" : ""}${eventState}${allHidden ? " is-dimmed" : ""}`;
          if (minimal) {
            const eventLabel = locale === "de" ? `${cell.events.length} Events` : `${cell.events.length} events`;
            return <button key={dateKey(cell.date)} type="button" className={classes} role="gridcell" aria-current={isToday ? "date" : undefined} aria-label={`${new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(cell.date)}${hasEvents ? `, ${eventLabel}` : ""}`} onClick={() => hasEvents ? setSelected(cell) : setSelected(null)}><span>{cell.date.getDate()}</span></button>;
          }
          if (!cell.inMonth) {
            // Design (Calendar.html): outside-month cells stay empty and faded.
            return <div key={dateKey(cell.date)} className={classes} role="gridcell" />;
          }
          return (
            <div key={dateKey(cell.date)} className={classes} role="gridcell">
              {cell.date.getDate()}
              {cell.events.slice(0, 2).map((event) => {
                const hidden = eventHidden(event, activeFilters);
                return (
                  <span key={event.slug}>
                    <Link to={`/events/${event.slug}`} className={`cal-chip${hidden ? " is-hidden" : ""}`} data-type={filterTypeOf(event) ?? undefined}>{event.title.full}</Link>
                    {event.startsAt ? (
                      <button type="button" className={`cal-save${hidden ? " is-hidden" : ""}`} title={locale === "de" ? "Im Kalender speichern" : "Save to calendar"} onClick={() => downloadEventIcs(event)}>
                        <i className="bi bi-calendar-plus" aria-hidden="true" /> {locale === "de" ? "Speichern" : "Save"}
                      </button>
                    ) : null}
                  </span>
                );
              })}
              {cell.events.length > 2 ? <button type="button" className="cal-more" onClick={() => setSelected(cell)}>+{cell.events.length - 2}</button> : null}
            </div>
          );
        })}</div>)}
      </div>
      {selected ? <DayDialog cell={selected} locale={locale} onClose={() => setSelected(null)} /> : null}
    </>
  );
}

function Agenda({ events, locale }: { events: PublicPost[]; locale: string }) {
  if (!events.length) return <EmptyState>{locale === "de" ? "Keine Events in diesem Monat." : "No events this month."}</EmptyState>;
  return <div className="agenda-list">{events.map((event) => <EventCard key={event.slug} event={event} locale={locale} compact />)}</div>;
}

function Timeline({ events, locale }: { events: PublicPost[]; locale: string }) {
  if (!events.length) return <EmptyState>{locale === "de" ? "Keine Events in diesem Monat." : "No events this month."}</EmptyState>;
  const de = locale === "de";
  return <div className="timeline-weeks">{groupEventsByWeek(events).map((group) => <section className="timeline-week" key={dateKey(group.start)}><h2>{de ? "Woche ab" : "Week of"} {new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(group.start)}</h2><div className="timeline-list">{group.events.map((event) => <article key={event.slug} className="timeline-item"><EventMarker eventKind={event.eventKind} />{event.startsAt ? <EventDate start={event.startsAt} end={event.endsAt} locale={locale} /> : null}<Link to={`/events/${event.slug}`}><EventTitle title={event.title} /></Link><p>{event.summary}</p>{event.registration ? <EventPaymentNotice registration={event.registration} locale={locale} /> : null}</article>)}</div></section>)}</div>;
}

function Board({ events, locale }: { events: PublicPost[]; locale: string }) {
  if (!events.length) return <EmptyState>{locale === "de" ? "Keine Events in diesem Monat." : "No events this month."}</EmptyState>;
  return <div className="calendar-board">{events.map((event, index) => {
    const date = event.startsAt ? new Date(event.startsAt) : null;
    return <article key={event.slug} className={`calendar-board-item board-tone-${index % 3}`}><Link className="calendar-board-link card-primary-link" to={`/events/${event.slug}`} aria-label={event.title.full}><div className="calendar-board-date">{date ? <><strong>{date.getDate()}</strong><span>{new Intl.DateTimeFormat(locale, { month: "short" }).format(date)}</span></> : null}</div><div><div className="event-card-type"><EventMarker eventKind={event.eventKind} />{event.eventKind ? getEventKind(event.eventKind)?.label[locale === "de" ? "de" : "en"] : null}</div><EventTitle title={event.title} /><p>{event.summary}</p>{event.registration ? <EventPaymentNotice registration={event.registration} locale={locale} /> : null}</div></Link></article>;
  })}</div>;
}

function CardList({ events, locale }: { events: PublicPost[]; locale: string }) {
  return events.length ? <div className="event-grid">{events.map((event) => <EventCard key={event.slug} event={event} locale={locale} />)}</div> : <EmptyState>{locale === "de" ? "Keine Events in diesem Monat." : "No events this month."}</EmptyState>;
}

function EventTable({ events, locale }: { events: PublicPost[]; locale: string }) {
  const de = locale === "de";
  if (!events.length) return <EmptyState>{de ? "Keine Events in diesem Monat." : "No events this month."}</EmptyState>;
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>{de ? "Datum" : "Date"}</th><th>Event</th><th>{de ? "Typ" : "Type"}</th><th>{de ? "Anmeldung" : "Registration"}</th></tr></thead><tbody>{events.map((event) => <tr key={event.slug}><td>{event.startsAt ? <EventDate start={event.startsAt} locale={locale} /> : ""}</td><td><Link to={`/events/${event.slug}`}>{event.title.full}</Link></td><td>{event.eventKind ? getEventKind(event.eventKind)?.label[de ? "de" : "en"] : "-"}</td><td>{event.registration ? `${event.registration.placesRemaining}/${event.registration.capacity}` : "-"}</td></tr>)}</tbody></table></div>;
}

export function CalendarPage() {
  const data = useData();
  const { locale } = useLocale();
  const { theme, isPreview } = usePublicTheme("calendar");
  const now = new Date();
  const [searchParams] = useSearchParams();
  const [cursor, setCursor] = useState(() => {
    const match = searchParams.get("month")?.match(/^(\d{4})-(\d{2})$/);
    const year = match ? Number(match[1]) : now.getFullYear();
    const month = match ? Number(match[2]) : now.getMonth() + 1;
    return month >= 1 && month <= 12 ? { year, month } : { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const calendar = useAsync(() => data.getCalendar(cursor.year, cursor.month), [data, cursor.year, cursor.month]);
  const shift = (delta: number) => setCursor(({ year, month }) => { const date = new Date(year, month - 1 + delta, 1); return { year: date.getFullYear(), month: date.getMonth() + 1 }; });
  const events = calendar.data?.events ?? [];
  const de = locale === "de";
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const toggleFilter = (key: string) => {
    setActiveFilters((current) => current.includes(key) ? current.filter((k) => k !== key) : [...current, key]);
  };
  const [phone, setPhone] = useState(() => window.matchMedia("(max-width: 560px)").matches);
  const [dropOpen, setDropOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 560px)");
    const onChange = () => setPhone(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  useEffect(() => {
    if (!dropOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) setDropOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDropOpen(false);
    };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [dropOpen]);
  const dropLabel = activeFilters.length === 0
    ? (de ? "Alles" : "Everything")
    : activeFilters.length === 1
      ? (CAL_FILTERS.find((f) => f.key === activeFilters[0])?.[de ? "labelDe" : "label"] ?? "")
      : de ? `${activeFilters.length} Typen` : `${activeFilters.length} types`;
  const visibleEvents = events.filter((event) => !eventHidden(event, activeFilters));
  const isGridTheme = !["agenda", "timeline", "board", "cards", "table"].includes(theme);

  return (
    <>
      <header className="page-hero">
        <p className="hero-coords">{de ? "Was läuft" : "What's on"} · 50°46′ N · 6°05′ E</p>
        <h1>{de ? "Kalender" : "Calendar"}</h1>
      </header>
      {isPreview ? <p className="notice notice-info">{de ? "Theme-Vorschau" : "Theme preview"}: <strong>{theme}</strong>.</p> : null}
      <div className="cal-controls" aria-label={de ? "Kalendersteuerung" : "Calendar controls"}>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => shift(-1)}>{de ? "← Zurück" : "← Previous"}</button>
        <h2>{new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(cursor.year, cursor.month - 1, 1))}</h2>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => shift(1)}>{de ? "Weiter →" : "Next →"}</button>
      </div>
      <div className="cal-filters" role="group" aria-label={de ? "Nach Eventtyp filtern" : "Filter by event type"} ref={filtersRef}>
        <span className="cal-filters-label">{de ? "Zeige" : "Show"}</span>
        {phone ? (
          <button type="button" className="cal-drop-toggle" aria-expanded={dropOpen} onClick={() => setDropOpen((value) => !value)}>
            <span className="lbl"><i className="bi bi-funnel" aria-hidden="true" /><span className="txt">{dropLabel}</span></span>
            {activeFilters.length > 1 ? <span className="tally">{activeFilters.length}</span> : null}
            <span className="caret" aria-hidden="true"><i className="bi bi-chevron-down" /></span>
          </button>
        ) : null}
        <div className={phone ? `cal-drop-menu${dropOpen ? " is-on" : ""}` : "cal-filter-strip"}>
          <button
            type="button"
            className="cal-filter is-all"
            aria-pressed={activeFilters.length === 0}
            onClick={() => { setActiveFilters([]); if (phone) setDropOpen(false); }}
          >
            {de ? "Alles" : "Everything"}
            {phone ? <i className="bi bi-check-lg tick" aria-hidden="true" /> : null}
          </button>
          {CAL_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className="cal-filter"
              aria-pressed={activeFilters.includes(filter.key)}
              style={{ "--dot": filter.dot } as CSSProperties}
              onClick={() => toggleFilter(filter.key)}
            >
              <span className="dot" aria-hidden="true" />{de ? filter.labelDe : filter.label}
              {phone ? <i className="bi bi-check-lg tick" aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      </div>
      <p className="cal-count" role="status">
        {visibleEvents.length === events.length
          ? de ? `${events.length} Events in diesem Monat` : `${events.length} events this month`
          : de ? `${visibleEvents.length} von ${events.length} Events angezeigt` : `${visibleEvents.length} of ${events.length} events shown`}
      </p>
      {calendar.loading ? <Loading /> : calendar.error ? <ErrorState error={calendar.error} onRetry={calendar.reload} /> : theme === "agenda" ? <Agenda events={visibleEvents} locale={locale} /> : theme === "timeline" ? <Timeline events={visibleEvents} locale={locale} /> : theme === "board" ? <Board events={visibleEvents} locale={locale} /> : theme === "cards" ? <CardList events={visibleEvents} locale={locale} /> : theme === "table" ? <EventTable events={visibleEvents} locale={locale} /> : <MonthGrid year={cursor.year} month={cursor.month} events={isGridTheme ? events : visibleEvents} locale={locale} minimal={theme === "public-grid"} activeFilters={activeFilters} />}
    </>
  );
}
