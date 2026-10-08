import { useEffect, useState } from "react";

import type { Locale, TandemMatch, TandemRequest, TandemReviewAction } from "../../api/types";
import { ConfirmDialog, EmptyState, ErrorState, Loading, PageHeader, StatusBadge } from "../../components/ui";
import { useSession } from "../../auth/SessionContext";
import { useData } from "../../data/DataProviderContext";
import { useAsync } from "../../hooks/useAsync";
import { useCurrentLocale } from "../../i18n/LocaleContext";
import { DataViews } from "./DataViews";

function requestLabel(item: TandemRequest, locale: Locale) {
  return item.firstName || item.lastName
    ? `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim()
    : `${locale === "de" ? "Anfrage" : "Request"} ${item.ref.slice(0, 6).toUpperCase()}`;
}

function languageSummary(item: TandemRequest) {
  return `${item.offeredLanguages.join(", ").toUpperCase() || "-"} -> ${item.requestedLanguages.join(", ").toUpperCase() || "-"}`;
}

/** Coarse matching signals visible in the pseudonymized (blind) list. */
function matchSignals(item: TandemRequest, locale: Locale) {
  const de = locale === "de";
  const parts = [`${de ? "Abreise" : "Departs"} ${item.departureMonth ?? "?"}`];
  if (item.sameGenderOnly) parts.push(de ? "nur gleiches Geschlecht" : "same-gender only");
  if (item.requestedNativeOnly) parts.push(de ? "nur Muttersprachler*innen" : "native only");
  return parts.join(" · ");
}

/** Private-tier identity context; falls back to the blind signals. */
function profileSummary(item: TandemRequest, locale: Locale) {
  const identity = [item.gender, item.occupation, item.countryOfOrigin].filter(Boolean).join(" · ");
  return identity || matchSignals(item, locale);
}

type PendingMatchAction = {
  candidate: TandemRequest;
  action: TandemReviewAction;
  label: string;
};

function MatchGroup({
  title,
  matches,
  sourceRef,
  showPrivate,
  reload,
}: {
  title: string;
  matches: TandemMatch[];
  sourceRef: string;
  showPrivate: boolean;
  reload: () => void;
}) {
  const data = useData();
  const locale = useCurrentLocale();
  const de = locale === "de";
  const [busyRef, setBusyRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMatchAction | null>(null);
  if (!matches.length) return null;

  const act = async (candidateRef: string, action: TandemReviewAction) => {
    setBusyRef(candidateRef);
    setError(null);
    try {
      await data.reviewTandemMatch(sourceRef, candidateRef, action);
      setPending(null);
      reload();
    } catch (reason) {
      setPending(null);
      setError(reason instanceof Error ? reason.message : de ? "Der Treffer konnte nicht aktualisiert werden." : "Match update failed.");
    } finally {
      setBusyRef(null);
    }
  };

  const guarded = (candidate: TandemRequest, action: TandemReviewAction, label: string) => {
    if (action === "hide" || action === "unpair") {
      setPending({ candidate, action, label });
    } else {
      void act(candidate.ref, action);
    }
  };

  const hideLabel = (hidden: boolean) => hidden ? (de ? "Einblenden" : "Show") : (de ? "Ausblenden" : "Hide");
  const pairLabel = (paired: boolean) => paired ? (de ? "Paar auflösen" : "Undo pair") : (de ? "Festes Paar" : "Final pair");

  return (
    <section className="tandem-match-group">
      <h3>{title}</h3>
      {error ? <p className="notice notice-bad" role="alert">{error}</p> : null}
      {matches.map((match) => {
        const busy = busyRef === match.candidate.ref;
        return (
          <article key={match.candidate.ref} className={`card tandem-match${match.review.hidden ? " is-muted" : ""}`}>
            <div>
              <strong>{requestLabel(match.candidate, locale)}</strong>
              <p>{languageSummary(match.candidate)}{showPrivate && match.candidate.email ? ` / ${match.candidate.email}` : ""}</p>
              <small>{match.reasons.join("; ")}</small>
            </div>
            <div className="capability-chips">
              <StatusBadge status={match.category} />
              <span className="badge badge-neutral">{de ? "Punkte" : "score"} {match.score}</span>
              {match.review.shortlisted ? <span className="badge badge-brand">{de ? "vorgemerkt" : "shortlisted"}</span> : null}
              {match.review.contactedAt ? <span className="badge badge-info">{de ? "kontaktiert" : "contacted"}</span> : null}
              {match.review.finalPairAt ? <span className="badge badge-ok">{de ? "festes Paar" : "final pair"}</span> : null}
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => guarded(match.candidate, match.review.hidden ? "show" : "hide", hideLabel(match.review.hidden))}>{hideLabel(match.review.hidden)}</button>
              <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => void act(match.candidate.ref, match.review.shortlisted ? "unshortlist" : "shortlist")}>{match.review.shortlisted ? (de ? "Nicht mehr vormerken" : "Remove shortlist") : (de ? "Vormerken" : "Shortlist")}</button>
              {showPrivate ? <>
                <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => void act(match.candidate.ref, match.review.contactedAt ? "uncontacted" : "contacted")}>{match.review.contactedAt ? (de ? "Kontakt zurücknehmen" : "Undo contacted") : (de ? "Kontaktiert" : "Contacted")}</button>
                <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => guarded(match.candidate, match.review.finalPairAt ? "unpair" : "final_pair", pairLabel(Boolean(match.review.finalPairAt)))}>{pairLabel(Boolean(match.review.finalPairAt))}</button>
              </> : null}
            </div>
          </article>
        );
      })}
      <ConfirmDialog
        open={pending !== null}
        title={de ? `Treffer: ${pending?.label ?? "Aktualisieren"}?` : `${pending?.label ?? "Update"} this match?`}
        body={pending
          ? (de
            ? `${requestLabel(pending.candidate, locale)} wird ${pending.action === "hide" ? "aus dieser Trefferliste ausgeblendet" : "nicht mehr als festes Paar geführt"}.`
            : `${requestLabel(pending.candidate, locale)} will be ${pending.action === "hide" ? "hidden from this match list" : "removed as the final pair"}.`)
          : undefined}
        confirmLabel={pending?.label}
        danger
        onConfirm={() => pending && void act(pending.candidate.ref, pending.action)}
        onCancel={() => !busyRef && setPending(null)}
      />
    </section>
  );
}

function MatchesView({ refId, showPrivate, onBack }: { refId: string; showPrivate: boolean; onBack: () => void }) {
  const data = useData();
  const state = useAsync(() => data.getTandemMatches(refId), [data, refId]);
  const locale = useCurrentLocale();
  const de = locale === "de";
  if (state.loading) return <Loading />;
  if (state.error || !state.data) return <ErrorState error={state.error} onRetry={state.reload} />;
  const payload = state.data;
  const total = Object.values(payload.groups).reduce((sum, entries) => sum + entries.length, 0);
  return <>
    <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>{de ? "Zurück zu allen Anfragen" : "Back to all requests"}</button>
    <div className="card tandem-source"><h2>{de ? "Treffer für" : "Matches for"} {requestLabel(payload.source, locale)}</h2><p>{languageSummary(payload.source)}</p></div>
    {total ? <>
      <MatchGroup title={de ? "Volle Treffer" : "Full matches"} matches={payload.groups.full ?? []} sourceRef={refId} showPrivate={showPrivate} reload={state.reload} />
      <MatchGroup title={de ? "Teilweise Treffer" : "Partial matches"} matches={payload.groups.partial ?? []} sourceRef={refId} showPrivate={showPrivate} reload={state.reload} />
      <MatchGroup title={de ? "Schwache Treffer" : "Weak matches"} matches={payload.groups.weak ?? []} sourceRef={refId} showPrivate={showPrivate} reload={state.reload} />
    </> : <EmptyState>{de ? "Noch keine passenden Partner*innen gefunden." : "No matching partners found yet."}</EmptyState>}
  </>;
}

function DuplicatesView() {
  const data = useData();
  const state = useAsync(() => data.getTandemDuplicates(), [data]);
  const locale = useCurrentLocale();
  const de = locale === "de";
  const [pendingMerge, setPendingMerge] = useState<{ keep: TandemRequest; remove: TandemRequest } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
      setPendingMerge(null);
      state.reload();
    } catch (reason) {
      setPendingMerge(null);
      setError(reason instanceof Error ? reason.message : de ? "Die Duplikat-Aktion ist fehlgeschlagen." : "Duplicate action failed.");
    } finally {
      setBusy(false);
    }
  };

  if (state.loading) return <Loading />;
  if (state.error || !state.data) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (!state.data.items.length) return <EmptyState>{de ? "Keine offenen wahrscheinlichen Duplikate." : "No unresolved likely duplicates."}</EmptyState>;

  return <>
    {error ? <p className="notice notice-bad" role="alert">{error}</p> : null}
    <div className="admin-data-list">
      {state.data.items.map((item) => <article className="card" key={`${item.left.ref}-${item.right.ref}`}>
        <h3>{requestLabel(item.left, locale)} / {requestLabel(item.right, locale)}</h3>
        <p>{item.reasons.join("; ")}</p>
        <div className="capability-chips"><StatusBadge status={item.category} /><span className="badge badge-neutral">{de ? "Punkte" : "score"} {item.score}</span></div>
        <div className="form-actions">
          <button className="btn btn-outline btn-sm" type="button" disabled={busy} onClick={() => void run(() => data.decideTandemDuplicate(item.left.ref, item.right.ref, "different"))}>{de ? "Verschiedene Personen" : "Different people"}</button>
          <button className="btn btn-ghost btn-sm" type="button" disabled={busy} onClick={() => void run(() => data.decideTandemDuplicate(item.left.ref, item.right.ref, "ignore"))}>{de ? "Ignorieren" : "Ignore"}</button>
          <button className="btn btn-danger btn-sm" type="button" disabled={busy} onClick={() => setPendingMerge({ keep: item.left, remove: item.right })}>{de ? "Zusammenführen in" : "Merge into"} {requestLabel(item.left, locale)}</button>
        </div>
      </article>)}
    </div>
    <ConfirmDialog
      open={pendingMerge !== null}
      title={de ? "Doppelte Anfragen zusammenführen?" : "Merge duplicate requests?"}
      body={pendingMerge
        ? (de
          ? `${requestLabel(pendingMerge.keep, locale)} (${pendingMerge.keep.ref}) bleibt erhalten. ${requestLabel(pendingMerge.remove, locale)} (${pendingMerge.remove.ref}) wird dauerhaft entfernt.`
          : `${requestLabel(pendingMerge.keep, locale)} (${pendingMerge.keep.ref}) will be kept. ${requestLabel(pendingMerge.remove, locale)} (${pendingMerge.remove.ref}) will be removed permanently.`)
        : undefined}
      confirmLabel={busy
        ? (de ? "Wird zusammengeführt…" : "Merging…")
        : de
          ? `Zusammenführen in ${pendingMerge ? requestLabel(pendingMerge.keep, locale) : "die erste"}`
          : `Merge into ${pendingMerge ? requestLabel(pendingMerge.keep, locale) : "first"}`}
      danger
      onConfirm={() => pendingMerge && !busy && void run(() => data.mergeTandemDuplicate(pendingMerge.keep.ref, pendingMerge.remove.ref))}
      onCancel={() => !busy && setPendingMerge(null)}
    />
  </>;
}

function TandemEditor({ item, onDone }: { item: TandemRequest; onDone: () => void }) {
  const data = useData();
  const locale = useCurrentLocale();
  const de = locale === "de";
  const [form, setForm] = useState({
    firstName: item.firstName ?? "",
    lastName: item.lastName ?? "",
    email: item.email ?? "",
    occupation: item.occupation ?? "",
    comment: item.comment ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await data.updateTandem(item.ref, form);
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : de ? "Die Anfrage konnte nicht aktualisiert werden." : "Request update failed.");
    } finally {
      setBusy(false);
    }
  };
  return <div className="card public-form">
    <h2>{de ? "Bearbeiten:" : "Edit"} {requestLabel(item, locale)}</h2>
    {error ? <p className="notice notice-bad" role="alert">{error}</p> : null}
    <div className="form-grid">
      <label>{de ? "Vorname" : "First name"}<input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></label>
      <label>{de ? "Nachname" : "Last name"}<input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></label>
      <label>{de ? "E-Mail" : "Email"}<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
      <label>{de ? "Tätigkeit" : "Occupation"}<input value={form.occupation} onChange={(event) => setForm({ ...form, occupation: event.target.value })} /></label>
    </div>
    <label>{de ? "Kommentar" : "Comment"}<textarea rows={5} value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} /></label>
    <div className="form-actions"><button className="btn btn-primary" type="button" disabled={busy} onClick={() => void save()}>{busy ? (de ? "Wird gespeichert…" : "Saving…") : (de ? "Speichern" : "Save")}</button><button className="btn btn-ghost" type="button" disabled={busy} onClick={onDone}>{de ? "Abbrechen" : "Cancel"}</button></div>
  </div>;
}

export function TandemPanel() {
  const data = useData();
  const session = useSession();
  const locale = useCurrentLocale();
  const de = locale === "de";
  const [query, setQuery] = useState("");
  const [viewed, setViewed] = useState("all");
  const [tab, setTab] = useState<"requests" | "duplicates">("requests");
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [edit, setEdit] = useState<TandemRequest | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const list = useAsync(() => data.getTandemRequests({ q: query, viewed }), [data, query, viewed]);

  useEffect(() => {
    if (list.data && !list.data.capabilities.corrections && tab === "duplicates") setTab("requests");
  }, [list.data, tab]);

  const payload = list.data;
  const showPrivate = payload?.capabilities.private ?? session.hasCapability("language_tandem_private");
  const canCorrect = payload?.capabilities.corrections ?? session.hasCapability("language_tandem_corrections");

  const switchTab = (next: "requests" | "duplicates") => {
    setTab(next);
    setOpenRef(null);
    setEdit(null);
    setActionError(null);
  };
  const markViewed = async (item: TandemRequest) => {
    setActionBusy(item.ref);
    setActionError(null);
    try {
      await data.markTandemViewed(item.ref, !item.isViewed);
      list.reload();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : de ? "Der Status der Anfrage konnte nicht geändert werden." : "Request status could not be changed.");
    } finally {
      setActionBusy(null);
    }
  };
  const actions = (item: TandemRequest) => <div className="form-actions">
    <button type="button" className="btn btn-outline btn-sm" disabled={actionBusy === item.ref} onClick={() => { setEdit(null); setOpenRef(item.ref); }}>{de ? "Treffer" : "Matches"}</button>
    <button type="button" className="btn btn-ghost btn-sm" disabled={actionBusy === item.ref} onClick={() => void markViewed(item)}>{item.isViewed ? (de ? "Ungelesen" : "Unread") : (de ? "Gesehen" : "Viewed")}</button>
    {canCorrect ? <button type="button" className="btn btn-ghost btn-sm" disabled={actionBusy === item.ref} onClick={() => { setOpenRef(null); setEdit(item); }}>{de ? "Bearbeiten" : "Edit"}</button> : null}
  </div>;
  const card = (item: TandemRequest) => <><small>{item.ref}</small><h3>{requestLabel(item, locale)}</h3><p>{languageSummary(item)}</p><p>{profileSummary(item, locale)}</p>{showPrivate && item.email ? <a href={`mailto:${item.email}`}>{item.email}</a> : null}{actions(item)}</>;

  return <>
    <PageHeader
      kicker={de ? "Sprachaustausch" : "Language exchange"}
      title={de ? "Sprachtandem" : "Language Tandem"}
      sub={showPrivate
        ? (de ? "Private Kontaktdaten stehen für das Matching zur Verfügung." : "Private contact details are available for matching.")
        : (de ? "Anonymer Modus: Die API hält persönliche Daten zurück." : "Blind mode: personal details are withheld by the API.")}
    />
    {!showPrivate ? <p className="notice notice-info">{de ? "Kontaktdaten werden bereits von der API verborgen. Aktiviere einen stärkeren Schlüssel, um sie anzuzeigen." : "Contact details are hidden at the API level. Activate a stronger key to reveal them."}</p> : null}
    <div className="tabs" role="tablist" aria-label={de ? "Ansichten des Sprachtandems" : "Language Tandem views"}>
      <button id="tandem-requests-tab" type="button" role="tab" aria-selected={tab === "requests"} aria-controls="tandem-panel" onClick={() => switchTab("requests")}>{de ? "Anfragen" : "Requests"}</button>
      {canCorrect ? <button id="tandem-duplicates-tab" type="button" role="tab" aria-selected={tab === "duplicates"} aria-controls="tandem-panel" onClick={() => switchTab("duplicates")}>{de ? "Duplikate" : "Duplicates"}</button> : null}
    </div>
    {actionError ? <p className="notice notice-bad" role="alert">{actionError}</p> : null}
    <div id="tandem-panel" role="tabpanel" aria-labelledby={tab === "duplicates" ? "tandem-duplicates-tab" : "tandem-requests-tab"}>
      {tab === "duplicates" ? <DuplicatesView /> : openRef ? (
        <MatchesView refId={openRef} showPrivate={showPrivate} onBack={() => setOpenRef(null)} />
      ) : edit ? (
        <TandemEditor item={edit} onDone={() => { setEdit(null); list.reload(); }} />
      ) : <>
        <div className="admin-filterbar">
          <label><span className="sr-only">{de ? "Tandem-Anfragen durchsuchen" : "Search Tandem requests"}</span><input aria-label={de ? "Tandem-Anfragen durchsuchen" : "Search Tandem requests"} type="search" value={query} placeholder={de ? "Anfragen durchsuchen" : "Search requests"} onChange={(event) => setQuery(event.target.value)} disabled={!showPrivate} /></label>
          <label><span className="sr-only">{de ? "Gesehen-Status" : "Viewed status"}</span><select aria-label={de ? "Gesehen-Status" : "Viewed status"} value={viewed} onChange={(event) => setViewed(event.target.value)}><option value="all">{de ? "Alle" : "All"}</option><option value="no">{de ? "Ungesehen" : "Unviewed"}</option><option value="yes">{de ? "Gesehen" : "Viewed"}</option></select></label>
          <span>{session.capabilities.length} {de ? "aktive Berechtigungen" : "active capabilities"}</span>
        </div>
        {list.loading ? <Loading /> : list.error || !payload ? <ErrorState error={list.error} onRetry={list.reload} /> : <DataViews items={payload.items} keyFor={(item) => item.ref} columns={de ? ["Anfrage", "Sprachen", "Signale", "Profil", "Status", "Aktionen"] : ["Request", "Languages", "Signals", "Profile", "Status", "Actions"]} renderCells={(item) => [<span><strong>{requestLabel(item, locale)}</strong>{showPrivate && item.email ? <><br/><small>{item.email}</small></> : null}</span>, languageSummary(item), matchSignals(item, locale), showPrivate ? [item.gender, item.occupation, item.countryOfOrigin].filter(Boolean).join(" · ") || "-" : "—", <StatusBadge status={item.isViewed ? "viewed" : "new"} />, actions(item)]} renderCard={card} empty={de ? "Keine Tandem-Anfragen passen zu diesen Filtern." : "No tandem requests match these filters."} />}
      </>}
    </div>
  </>;
}
