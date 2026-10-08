import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";

import type { Locale, PublicPost } from "../api/types";
import { useData } from "../data/DataProviderContext";
import { useAsync } from "../hooks/useAsync";
import { useLocale } from "../i18n/LocaleContext";
import { downloadEventIcs } from "../utils/ics";
import { assetUrl } from "../utils/assets";
import {
  archiveBlurb,
  archiveFormats,
  badgeParts,
  nextEventFor,
  pastRowFrom,
  sortEvents,
  staticPast,
  whenLabel,
  whereLabel,
} from "./eventFormats";
import type { Format } from "./eventFormats";

const ALIASES: Record<string, string> = {
  "country-evening-peru": "country-evening",
  "weekend-trip-maastricht": "weekend-trip",
  karaoke: "karaoke-night",
};

function formatFromParam(param: string | null, formats: Format[]): Format {
  const key = ALIASES[param ?? ""] ?? param ?? "";
  return formats.find((fmt) => fmt.key === key) ?? formats.find((fmt) => fmt.key === "country-evening")!;
}

type ArchRow = {
  date: string;
  title: string;
  note: string;
  meta: string;
  slug?: string;
  imageUrl?: string;
  record?: string;
  year: string;
};

function rowsFor(fmt: Format, archived: PublicPost[], locale: Locale): ArchRow[] {
  const real = archived
    .filter((event) => event.eventKind === fmt.kind)
    .map((event) => ({
      ...pastRowFrom(event, locale),
      year: event.startsAt ? String(new Date(event.startsAt).getFullYear()) : "",
    }));
  const statics = staticPast(fmt.key, locale).map((row) => ({ ...row, year: "2026" }));
  if (!real.length) return statics;
  // Editions with a kept record (photos, protocol, recipes) always stay listed,
  // ahead of the plain rows from the database.
  return [...statics.filter((row) => row.record), ...real];
}

export function EventArchivePage() {
  const data = useData();
  const [params] = useSearchParams();
  const { locale } = useLocale();
  const de = locale === "de";
  const formats = archiveFormats(locale);
  const fmt = formatFromParam(params.get("e"), formats);
  const posts = useAsync(() => data.getPublicPosts(), [data]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [fmt.key]);

  useEffect(() => {
    document.title = `INCAS · ${fmt.title}`;
  }, [fmt.title]);

  const events = useMemo(() => sortEvents(posts.data?.events ?? []), [posts.data]);
  const next = nextEventFor(fmt, events);
  const rows = rowsFor(fmt, posts.data?.archivedEvents ?? [], locale);
  const badge = badgeParts(next?.startsAt ?? null, locale);
  const blurb = archiveBlurb(fmt.key, locale) ?? fmt.desc;

  return (
    <>
      <Link to="/" className="ev-back"><i className="bi bi-arrow-left" aria-hidden="true" /> {de ? "Zur Startseite" : "Back to home"}</Link>
      <header className="ev-hero">
        <p className="hero-coords">Humboldt-Haus · 50°46′ N · 6°05′ E</p>
        <h1>{fmt.title} <em>{de ? "Archiv" : "archive"}</em></h1>
        <p>{blurb}</p>
      </header>

      <section aria-label={de ? "Nächste Ausgabe" : "Next edition"}>
        <div className="ev-next">
          {badge ? (
            <span className="ev-next-badge" aria-hidden="true"><span>{badge.month}</span><strong>{badge.day}</strong></span>
          ) : (
            <span className="ev-next-badge is-empty" aria-hidden="true"><i className="bi bi-calendar3" /></span>
          )}
          <div>
            <span className="kick">{de ? "Nächste Ausgabe" : "Next edition"}</span>
            <p className="when">{(next && whenLabel(next.startsAt, locale)) ?? fmt.fallbackNext}</p>
            <p className="where">{(next && whereLabel(next)) ?? fmt.fallbackWhere}</p>
          </div>
          <div className="btn-row">
            <Link to="/events#register" className="btn btn-primary btn-sm">{de ? "Anmelden" : "Register"}</Link>
            {next ? (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => downloadEventIcs(next)}>
                <i className="bi bi-calendar-plus" aria-hidden="true" /> {de ? "Termin speichern" : "Save the date"}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section aria-label={de ? "Frühere Ausgaben" : "Past editions"}>
        <div className="arch-head">
          <h2>{de ? "Frühere Ausgaben" : "Past editions"}</h2>
          <span className="count">{de ? `${rows.length} Ausgaben festgehalten` : `${rows.length} editions on record`}</span>
        </div>
        <div className="arch-list">
          {rows.map((row, index) => {
            const inner = (
              <>
                <span className="arch-thumb">
                  {row.imageUrl ? (
                    <img src={assetUrl(row.imageUrl) ?? undefined} alt="" loading="lazy" />
                  ) : (
                    <span className="arch-thumb-empty">{de ? "Foto" : "Photo"}</span>
                  )}
                </span>
                <span className="arch-when">{row.date}<br />{row.year}</span>
                <span>
                  <span className="arch-title">{row.title}</span>
                  <span className="arch-note">{row.note}</span>
                  {row.record ? (
                    <span className="arch-record-hint">
                      <i className="bi bi-journal-richtext" aria-hidden="true" /> {de ? "Fotos, Protokoll & Rezepte aufbewahrt" : "Photos, protocol & recipes kept"} <i className="bi bi-arrow-right" aria-hidden="true" />
                    </span>
                  ) : null}
                </span>
                <span className="arch-meta">{row.meta}</span>
              </>
            );
            return row.record ? (
              <Link className="arch-row has-record" to={`/events/archive/${row.record}`} key={row.record}>{inner}</Link>
            ) : row.slug ? (
              <Link className="arch-row" to={`/events/${row.slug}`} key={row.slug}>{inner}</Link>
            ) : (
              <span className="arch-row" key={`${row.title}-${index}`}>{inner}</span>
            );
          })}
        </div>
      </section>

      <section className="other-types" aria-label={de ? "Andere Eventarten" : "Other event types"}>
        <h2>{de ? "Andere Events" : "Other events"}</h2>
        <div className="type-chips">
          {formats.map((other) => (
            <Link
              key={other.key}
              className="type-chip"
              to={`/events/archive?e=${other.key}`}
              aria-current={other.key === fmt.key ? "page" : undefined}
            >
              <svg className="ic" aria-hidden="true"><use href={`#${other.icon}`} /></svg> {other.title}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
