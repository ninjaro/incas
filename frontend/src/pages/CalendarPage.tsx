import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import type { PublicPost } from "../api/types";
import { EventCard, EventDate, EventMarker, EventPaymentNotice, EventTitle } from "../components/events";
import { EmptyState, ErrorState, Loading, PageHeader } from "../components/ui";
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

function buildCells(year: number, month: number, events: PublicPost[]): DayCell[] {
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

function MonthGrid({ year, month, events, locale, minimal = false }: { year: number; month: number; events: PublicPost[]; locale: string; minimal?: boolean }) {
  const [selected, setSelected] = useState<DayCell | null>(null);
  const cells = buildCells(year, month, events);
  const weekdays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2026, 0, 5 + index)));
  const today = dateKey(new Date());
  return (
    <>
      <div className={`cal-grid${minimal ? " is-public-grid" : ""}`} role="grid" aria-label={new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1))}>
        {weekdays.map((weekday) => <div key={weekday} className="cal-grid-head" role="columnheader">{weekday}</div>)}
        {cells.map((cell) => {
          const hasEvents = cell.events.length > 0;
          const isToday = dateKey(cell.date) === today;
          const weekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
          const eventState = hasEvents ? (cell.events.some((event) => event.isLive) ? " has-upcoming" : " has-archived") : "";
          const classes = `cal-cell${cell.inMonth ? "" : " is-outside"}${weekend ? " is-weekend" : ""}${isToday ? " is-today" : ""}${hasEvents ? " has-events" : ""}${eventState}`;
          if (minimal) {
            const eventLabel = locale === "de" ? `${cell.events.length} Events` : `${cell.events.length} events`;
            return <button key={dateKey(cell.date)} type="button" className={classes} role="gridcell" aria-current={isToday ? "date" : undefined} aria-label={`${new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(cell.date)}${hasEvents ? `, ${eventLabel}` : ""}`} onClick={() => hasEvents ? setSelected(cell) : setSelected(null)}><span>{cell.date.getDate()}</span></button>;
          }
          return (
            <div key={dateKey(cell.date)} className={classes} role="gridcell">
              <span className="cal-day-number">{cell.date.getDate()}</span>
              <div className="cal-cell-events">{cell.events.slice(0, 2).map((event) => <Link key={event.slug} to={`/events/${event.slug}`} className="cal-chip"><EventMarker eventKind={event.eventKind} /><span>{event.title.full}</span>{event.registration?.priceCents ? <span aria-label="Payment required">EUR</span> : null}</Link>)}{cell.events.length > 2 ? <button type="button" className="cal-more" onClick={() => setSelected(cell)}>+{cell.events.length - 2}</button> : null}</div>
            </div>
          );
        })}
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
  return <div className="timeline-list">{events.map((event) => <article key={event.slug} className="timeline-item"><EventMarker eventKind={event.eventKind} />{event.startsAt ? <EventDate start={event.startsAt} end={event.endsAt} locale={locale} /> : null}<Link to={`/events/${event.slug}`}><EventTitle title={event.title} /></Link><p>{event.summary}</p>{event.registration ? <EventPaymentNotice registration={event.registration} locale={locale} /> : null}</article>)}</div>;
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
  const [kind, setKind] = useState("");
  const calendar = useAsync(() => data.getCalendar(cursor.year, cursor.month), [data, cursor.year, cursor.month]);
  const shift = (delta: number) => setCursor(({ year, month }) => { const date = new Date(year, month - 1 + delta, 1); return { year: date.getFullYear(), month: date.getMonth() + 1 }; });
  const allEvents = calendar.data?.events ?? [];
  const events = kind ? allEvents.filter((event) => event.eventKind === kind) : allEvents;
  const kinds = [...new Set(allEvents.map((event) => event.eventKind).filter((value): value is string => Boolean(value)))];
  const earlier = events.filter((event) => !event.isLive).length;
  const upcoming = events.length - earlier;
  const monthValue = `${cursor.year}-${String(cursor.month).padStart(2, "0")}`;
  const de = locale === "de";

  return (
    <>
      <PageHeader kicker={de ? "Was läuft" : "What's on"} title={de ? "Veranstaltungskalender" : "Event calendar"} sub={de ? `${upcoming} bevorstehend, ${earlier} bereits vorbei` : `${upcoming} upcoming, ${earlier} earlier this month`} />
      {isPreview ? <p className="notice notice-info">Theme preview: <strong>{theme}</strong>.</p> : null}
      <div className="cal-controls" aria-label={de ? "Kalendersteuerung" : "Calendar controls"}>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => shift(-1)}>{de ? "Zurück" : "Previous"}</button>
        <label><span className="sr-only">{de ? "Monat" : "Month"}</span><input type="month" value={monthValue} onChange={(event) => { const [year, month] = event.target.value.split("-").map(Number); if (year && month) setCursor({ year, month }); }} /></label>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCursor({ year: now.getFullYear(), month: now.getMonth() + 1 })}>{de ? "Heute" : "Today"}</button>
        <label><span className="sr-only">{de ? "Eventtyp" : "Event kind"}</span><select value={kind} onChange={(event) => setKind(event.target.value)}><option value="">{de ? "Alle Eventtypen" : "All event kinds"}</option>{kinds.map((id) => <option key={id} value={id}>{getEventKind(id)?.label[de ? "de" : "en"] ?? id}</option>)}</select></label>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => shift(1)}>{de ? "Weiter" : "Next"}</button>
      </div>
      {calendar.loading ? <Loading /> : calendar.error ? <ErrorState error={calendar.error} onRetry={calendar.reload} /> : theme === "agenda" ? <Agenda events={events} locale={locale} /> : theme === "timeline" || theme === "board" ? <Timeline events={events} locale={locale} /> : theme === "cards" ? <CardList events={events} locale={locale} /> : theme === "table" ? <EventTable events={events} locale={locale} /> : <MonthGrid year={cursor.year} month={cursor.month} events={events} locale={locale} minimal={theme === "public-grid"} />}
    </>
  );
}
