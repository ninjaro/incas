import { useState, type FormEvent } from "react";

import { EmptyState, Field, StatusBadge } from "../../components/ui";
import { useData } from "../../data/DataProviderContext";
import { KARAOKE_TRACKING_BATCH_SIZE } from "../../data/karaokeTracking";
import { usePublicFormErrors } from "../../forms/usePublicFormErrors";
import { useResilientPolling } from "../../hooks/useResilientPolling";
import { useLocale } from "../../i18n/LocaleContext";

const TRACKING_STORAGE_KEY = "incas-karaoke-tracking";
// The interval scales with the number of 20-ID batches, keeping the aggregate
// request rate at no more than 40/hour with retry headroom.
const QUEUE_POLL_MS = 90_000;

function loadTrackedIds(): string[] {
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem?.(TRACKING_STORAGE_KEY) ?? "[]");
    return Array.isArray(raw) ? [...new Set(raw.filter((value): value is string => typeof value === "string" && Boolean(value)))] : [];
  } catch {
    return [];
  }
}

function TrackedRequests({ refreshKey, de }: { refreshKey: number; de: boolean }) {
  const data = useData();
  const batchCount = Math.max(
    1,
    Math.ceil(loadTrackedIds().length / KARAOKE_TRACKING_BATCH_SIZE),
  );
  const tracked = useResilientPolling({
    load: () => {
      const ids = loadTrackedIds();
      return ids.length ? data.trackKaraokeRequests(ids) : Promise.resolve({ items: [], missing: [] });
    },
    deps: [data, refreshKey],
    intervalMs: QUEUE_POLL_MS * batchCount,
  });
  const entries = tracked.data?.items ?? [];
  const missing = tracked.data?.missing ?? [];

  const removeMissing = () => {
    const invalid = new Set(missing);
    localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(loadTrackedIds().filter((id) => !invalid.has(id))));
    void tracked.reload();
  };

  if (entries.length === 0 && missing.length === 0 && !tracked.error) return null;

  return (
    <div className="card">
      <h3>{de ? "Deine Wünsche" : "Your requests"}</h3>
      {tracked.error ? <p className="notice notice-info" role="status">{tracked.stale ? (de ? "Die zuletzt geladenen Daten bleiben sichtbar. Wir versuchen es später erneut." : "Last loaded data remains visible. We will retry later.") : (de ? "Die Tracking-Daten konnten noch nicht geladen werden. Wir versuchen es später erneut." : "Tracking data could not be loaded yet. We will retry later.")}</p> : null}
      {missing.length ? <p className="notice notice-info">{de ? "Einige gespeicherte Tracking-Codes sind nicht mehr verfügbar." : "Some saved tracking codes are no longer available."} <button type="button" className="link-button" onClick={removeMissing}>{de ? "Entfernen" : "Remove"}</button></p> : null}
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
  const formErrors = usePublicFormErrors(locale);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const queue = useResilientPolling({
    load: () => data.getKaraokeQueue(eventSlug),
    deps: [data, eventSlug],
    intervalMs: QUEUE_POLL_MS,
  });

  const change = (field: keyof typeof form, value: string) => {
    formErrors.clearField(field);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    formErrors.clear();
    try {
      const result = await data.submitKaraokeRequest({ ...form, eventSlug });
      const ids = loadTrackedIds();
      localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify([...new Set([...ids, result.publicId])]));
      setSubmitted(result.publicId);
      setForm({ displayName: "", songTitle: "", artist: "", note: "" });
      setRefreshKey((value) => value + 1);
      await queue.reload();
    } catch (error) {
      formErrors.report(error);
    } finally {
      setBusy(false);
    }
  };

  const items = queue.data?.items ?? [];

  return (
    <section className="karaoke-event-feature" aria-labelledby="karaoke-event-title">
      <header className="section-heading"><p className="page-kicker">Karaoke</p><h2 id="karaoke-event-title">{de ? `Song-Warteschlange für ${eventTitle}` : `Song queue for ${eventTitle}`}</h2><p>{de ? "Wünsche werden geprüft, bevor sie in der Live-Warteschlange dieses Events erscheinen." : "Requests are reviewed before they enter this event's live queue."}</p></header>

      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <form ref={formErrors.formRef} className="card" onSubmit={submit} noValidate aria-label={de ? "Song wünschen" : "Request a song"}>
          <h3>{de ? "Song wünschen" : "Request a song"}</h3>
          {formErrors.errors.form ? <p ref={formErrors.alertRef} className="notice notice-bad" role="alert" tabIndex={-1}>{formErrors.errors.form}</p> : null}
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
          <Field label={de ? "Dein Name oder Spitzname" : "Your name or nickname"} error={formErrors.errors.displayName}>
            <input
              name="displayName"
              value={form.displayName}
              onChange={(event) => change("displayName", event.target.value)}
              maxLength={120}
              required
            />
          </Field>
          <Field label={de ? "Songtitel" : "Song title"} error={formErrors.errors.songTitle}>
            <input
              name="songTitle"
              value={form.songTitle}
              onChange={(event) => change("songTitle", event.target.value)}
              maxLength={200}
              required
            />
          </Field>
          <Field label={de ? "Interpret:in (optional)" : "Artist (optional)"}>
            <input
              name="artist"
              value={form.artist}
              onChange={(event) => change("artist", event.target.value)}
              maxLength={200}
            />
          </Field>
          <Field label={de ? "Hinweis für die Moderation (optional)" : "Note for the host (optional)"}>
            <textarea
              name="note"
              value={form.note}
              onChange={(event) => change("note", event.target.value)}
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
            {queue.error ? <p className="notice notice-info" role="status">{queue.stale ? (de ? "Die letzte Warteschlange bleibt sichtbar. Die Aktualisierung wird später wiederholt." : "The last queue remains visible. Refresh will retry later.") : (de ? "Die Warteschlange konnte noch nicht geladen werden. Wir versuchen es später erneut." : "The queue could not be loaded yet. We will retry later.")}</p> : null}
            {items.length === 0 && !queue.error ? (
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
