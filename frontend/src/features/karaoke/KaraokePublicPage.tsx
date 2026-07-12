import { useEffect, useState, type FormEvent } from "react";

import { ApiError } from "../../api/client";
import type { KaraokePublicEntry } from "../../api/types";
import { EmptyState, Field, StatusBadge } from "../../components/ui";
import { useData } from "../../data/DataProviderContext";
import { useAsync } from "../../hooks/useAsync";
import { useLocale } from "../../i18n/LocaleContext";
import { localizeFieldErrors } from "../../i18n/errors";

const TRACKING_STORAGE_KEY = "incas-karaoke-tracking";
const QUEUE_POLL_MS = 10000;

function loadTrackedIds(): string[] {
  try {
    return JSON.parse(globalThis.localStorage?.getItem?.(TRACKING_STORAGE_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function TrackedRequests({ refreshKey, de }: { refreshKey: number; de: boolean }) {
  const data = useData();
  const [entries, setEntries] = useState<KaraokePublicEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const ids = loadTrackedIds();
      const results = await Promise.all(
        ids.map((id) => data.trackKaraokeRequest(id).catch(() => null)),
      );
      if (!cancelled) setEntries(results.filter((entry): entry is KaraokePublicEntry => !!entry));
    };
    void load();
    const timer = setInterval(load, QUEUE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [data, refreshKey]);

  if (entries.length === 0) return null;

  return (
    <div className="card">
      <h3>{de ? "Deine Wünsche" : "Your requests"}</h3>
      {entries.map((entry) => (
        <div key={entry.publicId} className="queue-row">
          <div className="queue-song">
            <strong>{entry.songTitle}</strong>
            <span>
              {entry.artist ? `${entry.artist} · ` : ""}{de ? "Tracking-Code" : "Tracking code"}: {entry.publicId}
            </span>
          </div>
          <StatusBadge status={entry.status} label={de ? ({ pending: "Ausstehend", approved: "Bestätigt", performing: "Auf der Bühne", completed: "Abgeschlossen", rejected: "Abgelehnt", cancelled: "Storniert" }[entry.status] ?? entry.status) : undefined} />
          {entry.queuePosition ? (
            <span className="badge badge-brand">#{entry.queuePosition} {de ? "in der Warteschlange" : "in queue"}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function KaraokeEventFeature({ eventSlug, eventTitle }: { eventSlug: string; eventTitle: string }) {
  const data = useData();
  const { locale } = useLocale();
  const de = locale === "de";
  const [form, setForm] = useState({ displayName: "", songTitle: "", artist: "", note: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const queue = useAsync(() => data.getKaraokeQueue(eventSlug), [eventSlug, refreshKey]);

  useEffect(() => {
    const timer = setInterval(() => setRefreshKey((value) => value + 1), QUEUE_POLL_MS);
    return () => clearInterval(timer);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setFieldErrors({});
    try {
      const result = await data.submitKaraokeRequest({ ...form, eventSlug });
      const ids = loadTrackedIds();
      localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify([...ids, result.publicId]));
      setSubmitted(result.publicId);
      setForm({ displayName: "", songTitle: "", artist: "", note: "" });
      setRefreshKey((value) => value + 1);
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setFieldErrors(localizeFieldErrors(error.fields, locale));
      } else if (error instanceof Error && "fields" in error) {
        setFieldErrors((error as { fields: Record<string, string> }).fields);
      } else {
        setFieldErrors({ songTitle: de ? "Der Wunsch konnte nicht gesendet werden. Versuch es erneut." : "Could not submit your request. Try again." });
      }
    } finally {
      setBusy(false);
    }
  };

  const items = queue.data?.items ?? [];

  return (
    <section className="karaoke-event-feature" aria-labelledby="karaoke-event-title">
      <header className="section-heading"><p className="page-kicker">Karaoke</p><h2 id="karaoke-event-title">{de ? `Song-Warteschlange für ${eventTitle}` : `Song queue for ${eventTitle}`}</h2><p>{de ? "Wünsche werden geprüft, bevor sie in der Live-Warteschlange dieses Events erscheinen." : "Requests are reviewed before they enter this event's live queue."}</p></header>

      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <form className="card" onSubmit={submit} aria-label={de ? "Song wünschen" : "Request a song"}>
          <h3>{de ? "Song wünschen" : "Request a song"}</h3>
          {submitted ? (
            <p className="notice notice-ok">
              {de ? "Wunsch erhalten! Dein Tracking-Code ist" : "Request received! Your tracking code is"} <strong>{submitted}</strong>. {de ? "Verfolge den Status unten unter" : "Follow its status in"}{" "}
              <button
                type="button"
                className="link-button"
                onClick={() =>
                  document
                    .getElementById("karaoke-tracked")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                {de ? "Deine Wünsche" : "Your requests"}
              </button>{" "}
              {de ? "." : " below."}
            </p>
          ) : null}
          <Field label={de ? "Dein Name oder Spitzname" : "Your name or nickname"} error={fieldErrors.displayName}>
            <input
              value={form.displayName}
              onChange={(event) => setForm({ ...form, displayName: event.target.value })}
              maxLength={120}
              required
            />
          </Field>
          <Field label={de ? "Songtitel" : "Song title"} error={fieldErrors.songTitle}>
            <input
              value={form.songTitle}
              onChange={(event) => setForm({ ...form, songTitle: event.target.value })}
              maxLength={200}
              required
            />
          </Field>
          <Field label={de ? "Interpret:in (optional)" : "Artist (optional)"}>
            <input
              value={form.artist}
              onChange={(event) => setForm({ ...form, artist: event.target.value })}
              maxLength={200}
            />
          </Field>
          <Field label={de ? "Hinweis für die Moderation (optional)" : "Note for the host (optional)"}>
            <textarea
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
              rows={2}
            />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? (de ? "Wird gesendet..." : "Submitting...") : (de ? "Wunsch senden" : "Submit request")}
          </button>
        </form>

        <div>
          <div className="card">
            <h3>{de ? "Live-Warteschlange" : "Live queue"}</h3>
            {items.length === 0 ? (
              <EmptyState>{de ? "Die Warteschlange ist leer. Wünsche dir den ersten Song!" : "The queue is empty. Be the first to request a song!"}</EmptyState>
            ) : (
              items.map((entry) => (
                <div
                  key={entry.publicId}
                  className={`queue-row${entry.status === "performing" ? " is-performing" : ""}`}
                >
                  <span className="queue-pos">{entry.queuePosition}</span>
                  <div className="queue-song">
                    <strong>{entry.songTitle}</strong>
                    <span>
                      {entry.artist ? `${entry.artist} · ` : ""}
                      {entry.displayName}
                    </span>
                  </div>
                  {entry.status === "performing" ? (
                    <span className="badge badge-brand">{de ? "Auf der Bühne" : "On stage"}</span>
                  ) : null}
                </div>
              ))
            )}
          </div>
          <div style={{ marginTop: 16 }} id="karaoke-tracked">
            <TrackedRequests refreshKey={refreshKey} de={de} />
          </div>
        </div>
      </div>
    </section>
  );
}
