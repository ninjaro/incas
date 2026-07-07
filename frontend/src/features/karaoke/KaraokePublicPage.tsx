import { useEffect, useState, type FormEvent } from "react";

import { ApiError } from "../../api/client";
import type { KaraokePublicEntry } from "../../api/types";
import { EmptyState, Field, PageHeader, StatusBadge } from "../../components/ui";
import { useData } from "../../data/DataProviderContext";
import { useAsync } from "../../hooks/useAsync";

const TRACKING_STORAGE_KEY = "incas-karaoke-tracking";
const QUEUE_POLL_MS = 10000;

function loadTrackedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(TRACKING_STORAGE_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function TrackedRequests({ refreshKey }: { refreshKey: number }) {
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
      <h3>Your requests</h3>
      {entries.map((entry) => (
        <div key={entry.publicId} className="queue-row">
          <div className="queue-song">
            <strong>{entry.songTitle}</strong>
            <span>
              {entry.artist ? `${entry.artist} · ` : ""}Tracking code: {entry.publicId}
            </span>
          </div>
          <StatusBadge status={entry.status} />
          {entry.queuePosition ? (
            <span className="badge badge-brand">#{entry.queuePosition} in queue</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function KaraokePublicPage() {
  const data = useData();
  const [form, setForm] = useState({ displayName: "", songTitle: "", artist: "", note: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const queue = useAsync(() => data.getKaraokeQueue(), [refreshKey]);

  useEffect(() => {
    const timer = setInterval(() => setRefreshKey((value) => value + 1), QUEUE_POLL_MS);
    return () => clearInterval(timer);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setFieldErrors({});
    try {
      const result = await data.submitKaraokeRequest(form);
      const ids = loadTrackedIds();
      localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify([...ids, result.publicId]));
      setSubmitted(result.publicId);
      setForm({ displayName: "", songTitle: "", artist: "", note: "" });
      setRefreshKey((value) => value + 1);
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setFieldErrors(error.fields);
      } else if (error instanceof Error && "fields" in error) {
        setFieldErrors((error as { fields: Record<string, string> }).fields);
      } else {
        setFieldErrors({ songTitle: "Could not submit your request. Try again." });
      }
    } finally {
      setBusy(false);
    }
  };

  const items = queue.data?.items ?? [];

  return (
    <>
      <PageHeader
        kicker="Karaoke"
        title="Song Queue"
        sub="Request a song and track your spot. Requests are reviewed by the karaoke team before they enter the live queue."
      />

      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <form className="card" onSubmit={submit} aria-label="Request a song">
          <h3>Request a song</h3>
          {submitted ? (
            <p className="notice notice-ok">
              Request received! Your tracking code is <strong>{submitted}</strong>. Follow its
              status in{" "}
              <button
                type="button"
                className="link-button"
                onClick={() =>
                  document
                    .getElementById("karaoke-tracked")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                Your requests
              </button>{" "}
              below.
            </p>
          ) : null}
          <Field label="Your name or nickname" error={fieldErrors.displayName}>
            <input
              value={form.displayName}
              onChange={(event) => setForm({ ...form, displayName: event.target.value })}
              maxLength={120}
              required
            />
          </Field>
          <Field label="Song title" error={fieldErrors.songTitle}>
            <input
              value={form.songTitle}
              onChange={(event) => setForm({ ...form, songTitle: event.target.value })}
              maxLength={200}
              required
            />
          </Field>
          <Field label="Artist (optional)">
            <input
              value={form.artist}
              onChange={(event) => setForm({ ...form, artist: event.target.value })}
              maxLength={200}
            />
          </Field>
          <Field label="Note for the host (optional)">
            <textarea
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
              rows={2}
            />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Submitting…" : "Submit request"}
          </button>
        </form>

        <div>
          <div className="card">
            <h3>Live queue</h3>
            {items.length === 0 ? (
              <EmptyState>The queue is empty — be the first to request a song!</EmptyState>
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
                    <span className="badge badge-brand">On stage</span>
                  ) : null}
                </div>
              ))
            )}
          </div>
          <div style={{ marginTop: 16 }} id="karaoke-tracked">
            <TrackedRequests refreshKey={refreshKey} />
          </div>
        </div>
      </div>
    </>
  );
}
