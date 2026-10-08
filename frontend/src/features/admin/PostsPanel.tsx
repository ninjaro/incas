import { useEffect, useState } from "react";
import { useBlocker } from "react-router-dom";

import { ApiError } from "../../api/client";
import type { AdminPost, PostInput, PostStatus, PostTemplateInfo } from "../../api/types";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Loading,
  PageHeader,
  StatusBadge,
  statusLabel,
} from "../../components/ui";
import { useData } from "../../data/DataProviderContext";
import { EVENT_KINDS, getEventKind } from "../../domain/eventKinds";
import { useAsync } from "../../hooks/useAsync";
import { useCurrentLocale } from "../../i18n/LocaleContext";
import { fromDateTimeLocal, toDateTimeLocal } from "../../utils/datetime";

const STATUS_FILTERS: (PostStatus | "all")[] = ["all", "draft", "scheduled", "published", "archived"];

export type EditorState = {
  title: string;
  summary: string;
  body: string;
  eventKind: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: string;
  publishAt: string;
  status: PostStatus;
  imageUrl: string;
  registrationLimitEnabled: boolean;
  registrationLimit: string;
  registrationPriceCents: string;
  registrationIsDeposit: boolean;
  registrationMode: "none" | "queue" | "karaoke";
  depositExplanation: string;
  venue: string;
  address: string;
  city: string;
  meetingPoint: string;
  destination: string;
  countryCode: string;
  latitude: string;
  longitude: string;
  destinationLatitude: string;
  destinationLongitude: string;
  featureFlags: string;
  isPinned: boolean;
  socialFacebook: boolean;
  socialInstagram: boolean;
};

export const EMPTY_EDITOR: EditorState = {
  title: "",
  summary: "",
  body: "",
  eventKind: "",
  startsAt: "",
  endsAt: "",
  durationMinutes: "",
  publishAt: "",
  status: "draft",
  imageUrl: "",
  registrationLimitEnabled: false,
  registrationLimit: "",
  registrationPriceCents: "",
  registrationIsDeposit: false,
  registrationMode: "none",
  depositExplanation: "",
  venue: "",
  address: "",
  city: "Aachen",
  meetingPoint: "",
  destination: "",
  countryCode: "",
  latitude: "",
  longitude: "",
  destinationLatitude: "",
  destinationLongitude: "",
  featureFlags: "",
  isPinned: false,
  socialFacebook: false,
  socialInstagram: false,
};

function editorFromPost(post: AdminPost): EditorState {
  return {
    title: post.title,
    summary: post.summary,
    body: post.body,
    eventKind: post.eventKind ?? "",
    startsAt: toDateTimeLocal(post.startsAt),
    endsAt: toDateTimeLocal(post.endsAt),
    durationMinutes: post.durationMinutes?.toString() ?? "",
    publishAt: toDateTimeLocal(post.publishAt),
    status: post.storedStatus,
    imageUrl: post.imageUrl,
    registrationLimitEnabled: post.registrationLimitEnabled,
    registrationLimit: post.registrationLimit?.toString() ?? "",
    registrationPriceCents: post.registrationPriceCents?.toString() ?? "",
    registrationIsDeposit: post.registrationIsDeposit,
    registrationMode: post.registrationMode,
    depositExplanation: post.depositExplanation,
    venue: post.venue,
    address: post.address,
    city: post.city,
    meetingPoint: post.meetingPoint,
    destination: post.destination,
    countryCode: post.countryCode,
    latitude: post.latitude?.toString() ?? "",
    longitude: post.longitude?.toString() ?? "",
    destinationLatitude: post.destinationLatitude?.toString() ?? "",
    destinationLongitude: post.destinationLongitude?.toString() ?? "",
    featureFlags: post.featureFlags.join(", "),
    isPinned: post.isPinned,
    socialFacebook: post.templateSocialSettings?.facebook === true,
    socialInstagram: post.templateSocialSettings?.instagram === true,
  };
}

export function editorToInput(editor: EditorState): PostInput {
  return {
    title: editor.title,
    summary: editor.summary,
    body: editor.body,
    eventKind: editor.eventKind || null,
    startsAt: fromDateTimeLocal(editor.startsAt),
    endsAt: fromDateTimeLocal(editor.endsAt),
    durationMinutes: editor.durationMinutes ? Number(editor.durationMinutes) : null,
    publishAt: fromDateTimeLocal(editor.publishAt),
    status: editor.status,
    imageUrl: editor.imageUrl,
    registrationLimitEnabled: editor.registrationLimitEnabled,
    registrationLimit: editor.registrationLimit ? Number(editor.registrationLimit) : null,
    registrationPriceCents: editor.registrationPriceCents
      ? Number(editor.registrationPriceCents)
      : null,
    registrationIsDeposit: editor.registrationIsDeposit,
    registrationMode: editor.registrationMode,
    depositExplanation: editor.depositExplanation,
    venue: editor.venue,
    address: editor.address,
    city: editor.city,
    meetingPoint: editor.meetingPoint,
    destination: editor.destination,
    countryCode: editor.countryCode,
    latitude: editor.latitude ? Number(editor.latitude) : null,
    longitude: editor.longitude ? Number(editor.longitude) : null,
    destinationLatitude: editor.destinationLatitude ? Number(editor.destinationLatitude) : null,
    destinationLongitude: editor.destinationLongitude ? Number(editor.destinationLongitude) : null,
    featureFlags: editor.featureFlags.split(",").map((value) => value.trim()).filter(Boolean),
    isPinned: editor.isPinned,
  };
}

export function nextScheduledStart(
  schedule: { weekday: number; time: string } | null,
  now = new Date(),
): string {
  if (!schedule) return "";

  const targetDay = (schedule.weekday + 1) % 7;
  const localNow = toDateTimeLocal(now);
  const [datePart, currentTime] = localNow.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  let daysAhead = (targetDay - candidate.getUTCDay() + 7) % 7;
  if (daysAhead === 0 && schedule.time <= currentTime) daysAhead = 7;
  candidate.setUTCDate(candidate.getUTCDate() + daysAhead);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${candidate.getUTCFullYear()}-${pad(candidate.getUTCMonth() + 1)}-${pad(candidate.getUTCDate())}T${schedule.time}`;
}

function PostEditor({
  post,
  onSaved,
  onClose,
}: {
  post: AdminPost | null;
  onSaved: (post: AdminPost) => void;
  onClose: () => void;
}) {
  const data = useData();
  const locale = useCurrentLocale();
  const de = locale === "de";
  const [currentPost, setCurrentPost] = useState(post);
  const [editor, setEditor] = useState<EditorState>(post ? editorFromPost(post) : EMPTY_EDITOR);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [savedSlug, setSavedSlug] = useState(post?.slug ?? "");
  const [slugBusy, setSlugBusy] = useState(false);
  const hasUnsavedChanges = dirty || slug !== savedSlug;
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    hasUnsavedChanges
    && `${currentLocation.pathname}${currentLocation.search}` !== `${nextLocation.pathname}${nextLocation.search}`,
  );

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (blocker.state === "blocked") setConfirmDiscard(true);
  }, [blocker.state]);

  const set = <K extends keyof EditorState>(key: K, value: EditorState[K]) => {
    setEditor((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const setEventKind = (eventKind: string) => {
    const kind = getEventKind(eventKind);
    setEditor((current) => {
      if (!kind) return { ...current, eventKind };
      return {
        ...current,
        eventKind,
        startsAt: current.startsAt || nextScheduledStart(kind.schedule),
        durationMinutes: current.durationMinutes || String(kind.defaultDurationMinutes),
        registrationLimitEnabled: current.registrationLimitEnabled || kind.registrationDefault,
        registrationLimit: current.registrationLimit || String(kind.defaultCapacity ?? ""),
        registrationPriceCents: current.registrationPriceCents || String(kind.defaultPriceCents ?? ""),
        registrationIsDeposit: current.registrationIsDeposit || kind.depositDefault,
        registrationMode: kind.registrationMode,
        featureFlags: current.featureFlags || kind.features.join(", "),
      };
    });
    setDirty(true);
  };

  const save = async () => {
    setBusy(true);
    setFieldErrors({});
    setNotice(null);
    try {
      const input = editorToInput(editor);
      const wasNew = currentPost === null;
      const saved = currentPost
        ? await data.updatePost(currentPost.id, input)
        : await data.createPost(input);
      let adopted: AdminPost = { ...saved, social: currentPost?.social ?? saved.social ?? [] };
      setCurrentPost(adopted);
      setSavedSlug(saved.slug);
      setSlug(saved.slug);
      setDirty(false);
      onSaved(adopted);

      const channels = [
        ...(editor.socialFacebook ? ["facebook"] : []),
        ...(editor.socialInstagram ? ["instagram"] : []),
      ];
      if (channels.length > 0 && saved.status !== "draft") {
        try {
          const published = await data.publishSocial(saved.id, channels);
          adopted = { ...adopted, social: published.results };
          setCurrentPost(adopted);
          setEditor((current) => ({ ...current, socialFacebook: false, socialInstagram: false }));
          onSaved(adopted);
        } catch (error) {
          setNotice({
            tone: "bad",
            text: de
              ? `Beitrag gespeichert, aber die Social-Media-Veröffentlichung ist fehlgeschlagen: ${error instanceof Error ? error.message : "unbekannter Fehler"}`
              : `Post saved, but social publishing failed: ${error instanceof Error ? error.message : "unknown error"}`,
          });
          return;
        }
      }

      setNotice({
        tone: "ok",
        text: wasNew
          ? (de ? "Beitrag erstellt." : "Post created.")
          : (de ? "Beitrag aktualisiert." : "Post updated."),
      });
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setFieldErrors(error.fields);
      } else {
        setNotice({
          tone: "bad",
          text: error instanceof Error ? error.message : de ? "Speichern fehlgeschlagen." : "Saving failed.",
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const saveAsTemplate = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await data.createTemplate({
        name: editor.title || (de ? "Vorlage ohne Titel" : "Untitled template"),
        titlePattern: editor.title,
        summary: editor.summary,
        body: editor.body,
        eventKind: editor.eventKind || null,
        registrationLimitEnabled: editor.registrationLimitEnabled,
        registrationLimit: editor.registrationLimit ? Number(editor.registrationLimit) : null,
        registrationPriceCents: editor.registrationPriceCents ? Number(editor.registrationPriceCents) : null,
        registrationIsDeposit: editor.registrationIsDeposit,
        registrationMode: editor.registrationMode,
        depositExplanation: editor.depositExplanation,
        imageUrl: editor.imageUrl,
        socialSettings: {
          facebook: editor.socialFacebook,
          instagram: editor.socialInstagram,
        },
      });
      setNotice({ tone: "ok", text: de ? "Als wiederverwendbare Vorlage gespeichert." : "Saved as a reusable template." });
    } catch (error) {
      setNotice({ tone: "bad", text: error instanceof Error ? error.message : de ? "Vorlage konnte nicht gespeichert werden." : "Template save failed." });
    } finally {
      setBusy(false);
    }
  };

  const changeSlug = async () => {
    if (!currentPost) return;
    setSlugBusy(true);
    setFieldErrors((current) => ({ ...current, slug: "" }));
    try {
      const updated = await data.updatePostSlug(currentPost.id, slug);
      const adopted = { ...currentPost, ...updated };
      setCurrentPost(adopted);
      setSlug(updated.slug);
      setSavedSlug(updated.slug);
      setNotice({
        tone: "ok",
        text: de
          ? "Beitrags-URL aktualisiert. Die bisherige URL leitet jetzt hierher weiter."
          : "Post URL updated. The previous URL now redirects here.",
      });
      onSaved(adopted);
    } catch (error) {
      if (error instanceof ApiError && error.fields.slug) {
        setFieldErrors((current) => ({ ...current, slug: error.fields.slug }));
      } else {
        setNotice({ tone: "bad", text: error instanceof Error ? error.message : de ? "URL konnte nicht geändert werden." : "URL update failed." });
      }
    } finally {
      setSlugBusy(false);
    }
  };

  const close = () => {
    if (hasUnsavedChanges) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  const togglePreview = async () => {
    if (preview) {
      setPreview(false);
      return;
    }
    setPreviewBusy(true);
    setPreviewError(null);
    try {
      setPreviewHtml((await data.previewPost(editor.body)).bodyHtml);
      setPreview(true);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : de ? "Die Vorschau konnte nicht erstellt werden." : "Preview could not be rendered.");
    } finally {
      setPreviewBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="page-header-row">
        <h3 style={{ margin: 0 }}>{currentPost ? `${de ? "Bearbeiten" : "Edit"}: ${currentPost.title}` : (de ? "Neuer Beitrag" : "New post")}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" disabled={previewBusy} onClick={() => void togglePreview()}>
            {preview
              ? (de ? "Zurück zum Bearbeiten" : "Back to editing")
              : previewBusy ? (de ? "Wird erstellt…" : "Rendering…") : (de ? "Vorschau" : "Preview")}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={close}>
            {de ? "Schließen" : "Close"}
          </button>
        </div>
      </div>
      {notice ? <p className={`notice notice-${notice.tone}`}>{notice.text}</p> : null}
      {previewError ? <p className="notice notice-bad" role="alert">{previewError}</p> : null}

      {preview ? (
        <div>
          <h2 style={{ fontFamily: "var(--font-display)" }}>{editor.title || (de ? "Ohne Titel" : "Untitled")}</h2>
          <p style={{ color: "var(--ink-soft)" }}>{editor.summary}</p>
          <div className="site-content" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      ) : (
        <>
          <h4>{de ? "Inhalt" : "Content"}</h4>
          <Field label={de ? "Titel" : "Title"} error={fieldErrors.title}>
            <input value={editor.title} onChange={(event) => set("title", event.target.value)} />
          </Field>
          {currentPost ? <div className="slug-editor"><Field label={de ? "URL-Kürzel" : "URL slug"} error={fieldErrors.slug}><input value={slug} onChange={(event) => setSlug(event.target.value)} /></Field><button type="button" className="btn btn-outline btn-sm" disabled={slugBusy || slug === savedSlug} onClick={changeSlug}>{slugBusy ? (de ? "Wird aktualisiert…" : "Updating…") : (de ? "URL ändern" : "Change URL")}</button><small>{de ? "Titeländerungen behalten diese URL. Eine Änderung legt eine Weiterleitung von der bisherigen URL an." : "Title edits keep this URL unchanged. Changing it creates a redirect from the previous URL."}</small></div> : null}
          <Field label={de ? "Zusammenfassung" : "Summary"}>
            <input value={editor.summary} onChange={(event) => set("summary", event.target.value)} maxLength={256} />
          </Field>
          <Field label={de ? "Text" : "Body"}>
            <textarea value={editor.body} onChange={(event) => set("body", event.target.value)} rows={6} />
          </Field>

          <h4>{de ? "Eventdetails" : "Event details"}</h4>
          <div className="form-grid">
            <Field label={de ? "Eventtyp" : "Event type"}>
              <select value={editor.eventKind} onChange={(event) => setEventKind(event.target.value)}>
                <option value="">{de ? "Kein Event / Sonstiges" : "Not an event / other"}</option>
                {Object.values(EVENT_KINDS).map((kind) => <option key={kind.id} value={kind.id}>{kind.label[locale]}</option>)}
              </select>
            </Field>
            <Field label={de ? "Beginn (Europe/Berlin)" : "Starts at (Europe/Berlin)"} error={fieldErrors.startsAt}>
              <input
                type="datetime-local"
                value={editor.startsAt}
                onChange={(event) => set("startsAt", event.target.value)}
              />
            </Field>
            <Field label={de ? "Ende (Europe/Berlin)" : "Ends at (Europe/Berlin)"} error={fieldErrors.endsAt}>
              <input type="datetime-local" value={editor.endsAt} onChange={(event) => set("endsAt", event.target.value)} />
            </Field>
            <Field label={de ? "Dauer (Minuten)" : "Duration (minutes)"} error={fieldErrors.durationMinutes}>
              <input type="number" min={1} value={editor.durationMinutes} onChange={(event) => set("durationMinutes", event.target.value)} />
            </Field>
          </div>

          <div className="form-grid">
            <Field label={de ? "Veranstaltungsort" : "Venue"}><input value={editor.venue} onChange={(event) => set("venue", event.target.value)} /></Field>
            <Field label={de ? "Adresse" : "Address"}><input value={editor.address} onChange={(event) => set("address", event.target.value)} /></Field>
            <Field label={de ? "Stadt" : "City"}><input value={editor.city} onChange={(event) => set("city", event.target.value)} /></Field>
            <Field label={de ? "Treffpunkt" : "Meeting point"}><input value={editor.meetingPoint} onChange={(event) => set("meetingPoint", event.target.value)} /></Field>
            <Field label={de ? "Ziel" : "Destination"}><input value={editor.destination} onChange={(event) => set("destination", event.target.value)} /></Field>
            <Field label={de ? "Ländercode" : "Country code"} error={fieldErrors.countryCode}><input maxLength={2} value={editor.countryCode} onChange={(event) => set("countryCode", event.target.value.toUpperCase())} /></Field>
            <Field label={de ? "Breitengrad des Orts" : "Venue latitude"} error={fieldErrors.latitude}><input type="number" step="any" value={editor.latitude} onChange={(event) => set("latitude", event.target.value)} /></Field>
            <Field label={de ? "Längengrad des Orts" : "Venue longitude"} error={fieldErrors.longitude}><input type="number" step="any" value={editor.longitude} onChange={(event) => set("longitude", event.target.value)} /></Field>
            <Field label={de ? "Breitengrad des Ziels" : "Destination latitude"}><input type="number" step="any" value={editor.destinationLatitude} onChange={(event) => set("destinationLatitude", event.target.value)} /></Field>
            <Field label={de ? "Längengrad des Ziels" : "Destination longitude"}><input type="number" step="any" value={editor.destinationLongitude} onChange={(event) => set("destinationLongitude", event.target.value)} /></Field>
          </div>
          <Field label={de ? "Zusätzliche Feature-Flags (kommagetrennt)" : "Extra feature flags (comma separated)"}><input value={editor.featureFlags} onChange={(event) => set("featureFlags", event.target.value)} /></Field>

          <h4>{de ? "Anmeldung" : "Registration"}</h4>
          <div className="form-grid">
            <div className="field field-check">
              <input
                id="reg-enabled"
                type="checkbox"
                checked={editor.registrationLimitEnabled}
                onChange={(event) => set("registrationLimitEnabled", event.target.checked)}
              />
              <label htmlFor="reg-enabled">{de ? "Begrenzte Plätze" : "Limited places"}</label>
            </div>
            <Field label={de ? "Plätze" : "Limit"} error={fieldErrors.registrationLimit}>
              <input
                type="number"
                min={0}
                value={editor.registrationLimit}
                onChange={(event) => set("registrationLimit", event.target.value)}
                disabled={!editor.registrationLimitEnabled}
              />
            </Field>
            <Field label={de ? "Preis (Cent)" : "Price (cents)"} error={fieldErrors.registrationPriceCents}>
              <input
                type="number"
                min={0}
                value={editor.registrationPriceCents}
                onChange={(event) => set("registrationPriceCents", event.target.value)}
                disabled={!editor.registrationLimitEnabled}
              />
            </Field>
            <div className="field field-check">
              <input
                id="reg-deposit"
                type="checkbox"
                checked={editor.registrationIsDeposit}
                onChange={(event) => set("registrationIsDeposit", event.target.checked)}
                disabled={!editor.registrationLimitEnabled}
              />
              <label htmlFor="reg-deposit">{de ? "Preis ist eine Kaution" : "Price is a deposit"}</label>
            </div>
            <Field label={de ? "Anmeldemodus" : "Registration mode"}><select value={editor.registrationMode} disabled={!editor.registrationLimitEnabled} onChange={(event) => set("registrationMode", event.target.value as EditorState["registrationMode"])}><option value="none">{de ? "Keiner" : "None"}</option><option value="queue">{de ? "Warteschlange" : "Queue"}</option><option value="karaoke">Karaoke</option></select></Field>
          </div>
          {editor.registrationIsDeposit ? <Field label={de ? "Erklärung zur Kaution" : "Deposit explanation"}><input value={editor.depositExplanation} onChange={(event) => set("depositExplanation", event.target.value)} /></Field> : null}

          <h4>{de ? "Medien" : "Media"}</h4>
          <Field label={de ? "Bild-URL (externe Bilder bevorzugt)" : "Image URL (external images preferred)"}>
            <input value={editor.imageUrl} onChange={(event) => set("imageUrl", event.target.value)} />
          </Field>

          <h4>{de ? "Veröffentlichung" : "Publication"}</h4>
          <div className="form-grid">
            <Field label="Status" error={fieldErrors.status}>
              <select
                value={editor.status}
                onChange={(event) => set("status", event.target.value as PostStatus)}
              >
                <option value="draft">{de ? "Entwurf (nicht öffentlich)" : "Draft (not public)"}</option>
                <option value="scheduled">{de ? "Geplant" : "Scheduled"}</option>
                <option value="published">{de ? "Veröffentlicht" : "Published"}</option>
                <option value="archived">{de ? "Archiviert" : "Archived"}</option>
              </select>
            </Field>
            {editor.status === "scheduled" ? (
              <Field label={de ? "Veröffentlichen am (Europe/Berlin)" : "Publish at (Europe/Berlin)"} error={fieldErrors.publishAt}>
                <input
                  type="datetime-local"
                  value={editor.publishAt}
                  onChange={(event) => set("publishAt", event.target.value)}
                />
              </Field>
            ) : null}
            <label className="check-row"><input type="checkbox" checked={editor.isPinned} onChange={(event) => set("isPinned", event.target.checked)} />{de ? "Beitrag anpinnen" : "Pin this post"}</label>
          </div>

          <h4>{de ? "Social-Media-Kanäle" : "Social channels"}</h4>
          <div className="form-grid">
            <div className="field field-check">
              <input
                id="social-fb"
                type="checkbox"
                checked={editor.socialFacebook}
                onChange={(event) => set("socialFacebook", event.target.checked)}
              />
              <label htmlFor="social-fb">{de ? "Auf Facebook veröffentlichen" : "Publish to Facebook"}</label>
            </div>
            <div className="field field-check">
              <input
                id="social-ig"
                type="checkbox"
                checked={editor.socialInstagram}
                onChange={(event) => set("socialInstagram", event.target.checked)}
              />
              <label htmlFor="social-ig">{de ? "Auf Instagram veröffentlichen" : "Publish to Instagram"}</label>
            </div>
          </div>
          {currentPost?.social?.length ? (
            <div>
              {currentPost.social.map((publication) => (
                <p key={publication.id} style={{ margin: "4px 0", fontSize: "0.88rem" }}>
                  {publication.provider}: <StatusBadge status={publication.status} />{" "}
                  {publication.isSimulated ? <span className="badge badge-warn">{de ? "simuliert" : "simulated"}</span> : null}{" "}
                  {publication.permalink ? (
                    <a href={publication.permalink} target="_blank" rel="noreferrer">
                      {de ? "Permalink" : "permalink"}
                    </a>
                  ) : null}
                  {publication.status === "failed" ? (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => void data.retrySocial(publication.id)
                        .then(() => data.getAdminPost(currentPost.id))
                        .then((updated) => {
                          setCurrentPost(updated);
                          onSaved(updated);
                        })
                        .catch((error) => setNotice({ tone: "bad", text: error instanceof Error ? error.message : de ? "Erneuter Versuch fehlgeschlagen." : "Retry failed." }))}
                    >
                      {de ? "Erneut versuchen" : "Retry"}
                    </button>
                  ) : null}
                </p>
              ))}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
              {busy
                ? (de ? "Wird gespeichert…" : "Saving…")
                : editor.status === "draft" ? (de ? "Entwurf speichern" : "Save draft") : (de ? "Speichern" : "Save")}
            </button>
            <button type="button" className="btn btn-outline" onClick={saveAsTemplate} disabled={busy}>
              {de ? "Als Vorlage speichern" : "Save as template"}
            </button>
            {hasUnsavedChanges ? <span className="badge badge-warn">{de ? "Ungespeicherte Änderungen" : "Unsaved changes"}</span> : null}
          </div>
        </>
      )}
      <ConfirmDialog
        open={confirmDiscard}
        title={de ? "Ungespeicherte Änderungen verwerfen?" : "Discard unsaved changes?"}
        body={de ? "Deine Änderungen wurden noch nicht gespeichert." : "Your edits have not been saved."}
        confirmLabel={de ? "Verwerfen" : "Discard"}
        danger
        onConfirm={() => {
          setConfirmDiscard(false);
          if (blocker.state === "blocked") {
            setDirty(false);
            blocker.proceed();
          } else {
            onClose();
          }
        }}
        onCancel={() => {
          setConfirmDiscard(false);
          if (blocker.state === "blocked") blocker.reset();
        }}
      />
    </div>
  );
}

function TemplatesTab({ onUse }: { onUse: (post: AdminPost) => void }) {
  const data = useData();
  const templates = useAsync(() => data.getTemplates(), []);
  const locale = useCurrentLocale();
  const de = locale === "de";
  const [confirmDelete, setConfirmDelete] = useState<PostTemplateInfo | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (task: () => Promise<unknown>) => {
    setNotice(null);
    try {
      await task();
      templates.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : de ? "Aktion fehlgeschlagen." : "Action failed.");
    }
  };

  if (templates.loading) return <Loading />;
  if (templates.error) return <ErrorState error={templates.error} onRetry={templates.reload} />;

  const items = templates.data?.items ?? [];

  return (
    <>
      {notice ? <p className="notice notice-bad">{notice}</p> : null}
      {items.length === 0 ? (
        <EmptyState>
          {de
            ? "Noch keine Vorlagen. Öffne einen Beitrag im Editor und wähle „Als Vorlage speichern“."
            : "No templates yet. Open a post in the editor and use “Save as template”."}
        </EmptyState>
      ) : (
        <div className="table-wrap"><table className="table">
          <thead>
            <tr>
              <th>{de ? "Vorlage" : "Template"}</th>
              <th>{de ? "Eventtyp" : "Event type"}</th>
              <th>{de ? "Aktualisiert" : "Updated"}</th>
              <th>
                <span className="sr-only">{de ? "Aktionen" : "Actions"}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((template) => (
              <tr key={template.id}>
                <td>
                  <strong>{template.name}</strong>
                  <div style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
                    {template.summary}
                  </div>
                </td>
                <td>{template.eventKind ? getEventKind(template.eventKind)?.label[locale] ?? template.eventKind : "—"}</td>
                <td>{template.updatedAt ? new Date(template.updatedAt).toLocaleDateString(locale) : "—"}</td>
                <td>
                  <div className="queue-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() =>
                        run(async () => onUse(await data.createPostFromTemplate(template.id)))
                      }
                    >
                      {de ? "Neuer Beitrag" : "New post"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => run(() => data.duplicateTemplate(template.id))}
                    >
                      {de ? "Duplizieren" : "Duplicate"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setConfirmDelete(template)}
                    >
                      {de ? "Löschen" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      <ConfirmDialog
        open={confirmDelete !== null}
        title={de ? "Vorlage löschen?" : "Delete template?"}
        body={confirmDelete
          ? (de ? `„${confirmDelete.name}“ wird dauerhaft entfernt.` : `"${confirmDelete.name}" will be removed permanently.`)
          : undefined}
        confirmLabel={de ? "Löschen" : "Delete"}
        danger
        onConfirm={() => {
          if (confirmDelete) void run(() => data.deleteTemplate(confirmDelete.id));
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}

export function PostsPanel() {
  const data = useData();
  const [filter, setFilter] = useState<PostStatus | "all">("all");
  const [tab, setTab] = useState<"posts" | "templates">("posts");
  const [editing, setEditing] = useState<AdminPost | null | "new">(null);
  const locale = useCurrentLocale();
  const de = locale === "de";

  const posts = useAsync(
    () => data.getAdminPosts(filter === "all" ? undefined : { status: filter }),
    [filter],
  );

  const openPost = async (post: AdminPost) => {
    setEditing(await data.getAdminPost(post.id));
  };

  return (
    <>
      <PageHeader
        kicker={de ? "Veröffentlichen" : "Publishing"}
        title={de ? "Beiträge & Events" : "Posts & Events"}
        sub={de
          ? "Entwürfe bleiben privat, geplante Beiträge werden zum Veröffentlichungszeitpunkt automatisch öffentlich (Europe/Berlin)."
          : "Drafts stay private, scheduled posts go public automatically at their publication time (Europe/Berlin)."}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
            {de ? "Neuer Beitrag" : "New post"}
          </button>
        }
      />
      {editing !== null ? (
        <PostEditor
          post={editing === "new" ? null : editing}
          onSaved={() => posts.reload()}
          onClose={() => setEditing(null)}
        />
      ) : (
        <>
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "posts"} onClick={() => setTab("posts")}>
              {de ? "Beiträge" : "Posts"}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "templates"}
              onClick={() => setTab("templates")}
            >
              {de ? "Vorlagen" : "Templates"}
            </button>
          </div>
          {tab === "templates" ? (
            <TemplatesTab onUse={(post) => setEditing(post)} />
          ) : (
            <>
              <div className="filter-buttons" role="group" aria-label={de ? "Beitragsstatus" : "Post status"}>
                {STATUS_FILTERS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`btn btn-sm ${filter === status ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setFilter(status)}
                  >
                    {de ? statusLabel(status, locale) : status}
                  </button>
                ))}
              </div>
              {posts.loading ? (
                <Loading />
              ) : posts.error ? (
                <ErrorState error={posts.error} onRetry={posts.reload} />
              ) : (posts.data?.items.length ?? 0) === 0 ? (
                <EmptyState>{de ? "Keine Beiträge mit diesem Status." : "No posts with this status."}</EmptyState>
              ) : (
                <div className="table-wrap"><table className="table">
                  <thead>
                    <tr>
                      <th>{de ? "Beitrag" : "Post"}</th>
                      <th>Status</th>
                      <th>{de ? "Eventdatum" : "Event date"}</th>
                      <th>{de ? "Veröffentlichung" : "Publish at"}</th>
                      <th>
                        <span className="sr-only">{de ? "Aktionen" : "Actions"}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(posts.data?.items ?? []).map((post) => (
                      <tr key={post.id}>
                        <td>
                          <strong>{post.title}</strong>
                          <div style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
                            {post.summary}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={post.status} />
                        </td>
                        <td>{post.startsAt ? new Date(post.startsAt).toLocaleString(locale) : "—"}</td>
                        <td>{post.publishAt ? new Date(post.publishAt).toLocaleString(locale) : "—"}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => void openPost(post)}
                          >
                            {de ? "Bearbeiten" : "Edit"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
