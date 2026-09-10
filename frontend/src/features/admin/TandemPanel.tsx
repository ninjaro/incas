import { useEffect, useState } from "react";

import type { TandemMatch, TandemRequest, TandemReviewAction } from "../../api/types";
import { ConfirmDialog, EmptyState, ErrorState, Loading, PageHeader, StatusBadge } from "../../components/ui";
import { useSession } from "../../auth/SessionContext";
import { useData } from "../../data/DataProviderContext";
import { useAsync } from "../../hooks/useAsync";
import { DataViews } from "./DataViews";

function requestLabel(item: TandemRequest) {
  return item.firstName || item.lastName
    ? `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim()
    : `Request ${item.ref.slice(0, 6).toUpperCase()}`;
}

function languageSummary(item: TandemRequest) {
  return `${item.offeredLanguages.join(", ").toUpperCase() || "-"} -> ${item.requestedLanguages.join(", ").toUpperCase() || "-"}`;
}

/** Coarse matching signals visible in the pseudonymized (blind) list. */
function matchSignals(item: TandemRequest) {
  const parts = [`Departs ${item.departureMonth ?? "?"}`];
  if (item.sameGenderOnly) parts.push("same-gender only");
  if (item.requestedNativeOnly) parts.push("native only");
  return parts.join(" · ");
}

/** Private-tier identity context; falls back to the blind signals. */
function profileSummary(item: TandemRequest) {
  const identity = [item.gender, item.occupation, item.countryOfOrigin].filter(Boolean).join(" · ");
  return identity || matchSignals(item);
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
      setError(reason instanceof Error ? reason.message : "Match update failed.");
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

  return (
    <section className="tandem-match-group">
      <h3>{title}</h3>
      {error ? <p className="notice notice-bad" role="alert">{error}</p> : null}
      {matches.map((match) => {
        const busy = busyRef === match.candidate.ref;
        return (
          <article key={match.candidate.ref} className={`card tandem-match${match.review.hidden ? " is-muted" : ""}`}>
            <div>
              <strong>{requestLabel(match.candidate)}</strong>
              <p>{languageSummary(match.candidate)}{showPrivate && match.candidate.email ? ` / ${match.candidate.email}` : ""}</p>
              <small>{match.reasons.join("; ")}</small>
            </div>
            <div className="capability-chips">
              <StatusBadge status={match.category} />
              <span className="badge badge-neutral">score {match.score}</span>
              {match.review.shortlisted ? <span className="badge badge-brand">shortlisted</span> : null}
              {match.review.contactedAt ? <span className="badge badge-info">contacted</span> : null}
              {match.review.finalPairAt ? <span className="badge badge-ok">final pair</span> : null}
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => guarded(match.candidate, match.review.hidden ? "show" : "hide", match.review.hidden ? "Show" : "Hide")}>{match.review.hidden ? "Show" : "Hide"}</button>
              <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => void act(match.candidate.ref, match.review.shortlisted ? "unshortlist" : "shortlist")}>{match.review.shortlisted ? "Remove shortlist" : "Shortlist"}</button>
              {showPrivate ? <>
                <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => void act(match.candidate.ref, match.review.contactedAt ? "uncontacted" : "contacted")}>{match.review.contactedAt ? "Undo contacted" : "Contacted"}</button>
                <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => guarded(match.candidate, match.review.finalPairAt ? "unpair" : "final_pair", match.review.finalPairAt ? "Undo pair" : "Final pair")}>{match.review.finalPairAt ? "Undo pair" : "Final pair"}</button>
              </> : null}
            </div>
          </article>
        );
      })}
      <ConfirmDialog
        open={pending !== null}
        title={`${pending?.label ?? "Update"} this match?`}
        body={pending ? `${requestLabel(pending.candidate)} will be ${pending.action === "hide" ? "hidden from this match list" : "removed as the final pair"}.` : undefined}
        confirmLabel={pending?.label ?? "Confirm"}
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
  if (state.loading) return <Loading />;
  if (state.error || !state.data) return <ErrorState error={state.error} onRetry={state.reload} />;
  const payload = state.data;
  const total = Object.values(payload.groups).reduce((sum, entries) => sum + entries.length, 0);
  return <>
    <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>Back to all requests</button>
    <div className="card tandem-source"><h2>Matches for {requestLabel(payload.source)}</h2><p>{languageSummary(payload.source)}</p></div>
    {total ? <>
      <MatchGroup title="Full matches" matches={payload.groups.full ?? []} sourceRef={refId} showPrivate={showPrivate} reload={state.reload} />
      <MatchGroup title="Partial matches" matches={payload.groups.partial ?? []} sourceRef={refId} showPrivate={showPrivate} reload={state.reload} />
      <MatchGroup title="Weak matches" matches={payload.groups.weak ?? []} sourceRef={refId} showPrivate={showPrivate} reload={state.reload} />
    </> : <EmptyState>No matching partners found yet.</EmptyState>}
  </>;
}

function DuplicatesView() {
  const data = useData();
  const state = useAsync(() => data.getTandemDuplicates(), [data]);
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
      setError(reason instanceof Error ? reason.message : "Duplicate action failed.");
    } finally {
      setBusy(false);
    }
  };

  if (state.loading) return <Loading />;
  if (state.error || !state.data) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (!state.data.items.length) return <EmptyState>No unresolved likely duplicates.</EmptyState>;

  return <>
    {error ? <p className="notice notice-bad" role="alert">{error}</p> : null}
    <div className="admin-data-list">
      {state.data.items.map((item) => <article className="card" key={`${item.left.ref}-${item.right.ref}`}>
        <h3>{requestLabel(item.left)} / {requestLabel(item.right)}</h3>
        <p>{item.reasons.join("; ")}</p>
        <div className="capability-chips"><StatusBadge status={item.category} /><span className="badge badge-neutral">score {item.score}</span></div>
        <div className="form-actions">
          <button className="btn btn-outline btn-sm" type="button" disabled={busy} onClick={() => void run(() => data.decideTandemDuplicate(item.left.ref, item.right.ref, "different"))}>Different people</button>
          <button className="btn btn-ghost btn-sm" type="button" disabled={busy} onClick={() => void run(() => data.decideTandemDuplicate(item.left.ref, item.right.ref, "ignore"))}>Ignore</button>
          <button className="btn btn-danger btn-sm" type="button" disabled={busy} onClick={() => setPendingMerge({ keep: item.left, remove: item.right })}>Merge into {requestLabel(item.left)}</button>
        </div>
      </article>)}
    </div>
    <ConfirmDialog
      open={pendingMerge !== null}
      title="Merge duplicate requests?"
      body={pendingMerge ? `${requestLabel(pendingMerge.keep)} (${pendingMerge.keep.ref}) will be kept. ${requestLabel(pendingMerge.remove)} (${pendingMerge.remove.ref}) will be removed permanently.` : undefined}
      confirmLabel={busy ? "Merging…" : `Merge into ${pendingMerge ? requestLabel(pendingMerge.keep) : "first"}`}
      danger
      onConfirm={() => pendingMerge && !busy && void run(() => data.mergeTandemDuplicate(pendingMerge.keep.ref, pendingMerge.remove.ref))}
      onCancel={() => !busy && setPendingMerge(null)}
    />
  </>;
}

function TandemEditor({ item, onDone }: { item: TandemRequest; onDone: () => void }) {
  const data = useData();
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
      setError(reason instanceof Error ? reason.message : "Request update failed.");
    } finally {
      setBusy(false);
    }
  };
  return <div className="card public-form">
    <h2>Edit {requestLabel(item)}</h2>
    {error ? <p className="notice notice-bad" role="alert">{error}</p> : null}
    <div className="form-grid">
      <label>First name<input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></label>
      <label>Last name<input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></label>
      <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
      <label>Occupation<input value={form.occupation} onChange={(event) => setForm({ ...form, occupation: event.target.value })} /></label>
    </div>
    <label>Comment<textarea rows={5} value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} /></label>
    <div className="form-actions"><button className="btn btn-primary" type="button" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</button><button className="btn btn-ghost" type="button" disabled={busy} onClick={onDone}>Cancel</button></div>
  </div>;
}

export function TandemPanel() {
  const data = useData();
  const session = useSession();
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
      setActionError(reason instanceof Error ? reason.message : "Request status could not be changed.");
    } finally {
      setActionBusy(null);
    }
  };
  const actions = (item: TandemRequest) => <div className="form-actions">
    <button type="button" className="btn btn-outline btn-sm" disabled={actionBusy === item.ref} onClick={() => { setEdit(null); setOpenRef(item.ref); }}>Matches</button>
    <button type="button" className="btn btn-ghost btn-sm" disabled={actionBusy === item.ref} onClick={() => void markViewed(item)}>{item.isViewed ? "Unread" : "Viewed"}</button>
    {canCorrect ? <button type="button" className="btn btn-ghost btn-sm" disabled={actionBusy === item.ref} onClick={() => { setOpenRef(null); setEdit(item); }}>Edit</button> : null}
  </div>;
  const card = (item: TandemRequest) => <><small>{item.ref}</small><h3>{requestLabel(item)}</h3><p>{languageSummary(item)}</p><p>{profileSummary(item)}</p>{showPrivate && item.email ? <a href={`mailto:${item.email}`}>{item.email}</a> : null}{actions(item)}</>;

  return <>
    <PageHeader kicker="Language exchange" title="Language Tandem" sub={showPrivate ? "Private contact details are available for matching." : "Blind mode: personal details are withheld by the API."} />
    {!showPrivate ? <p className="notice notice-info">Contact details are hidden at the API level. Activate a stronger key to reveal them.</p> : null}
    <div className="tabs" role="tablist" aria-label="Language Tandem views">
      <button id="tandem-requests-tab" type="button" role="tab" aria-selected={tab === "requests"} aria-controls="tandem-panel" onClick={() => switchTab("requests")}>Requests</button>
      {canCorrect ? <button id="tandem-duplicates-tab" type="button" role="tab" aria-selected={tab === "duplicates"} aria-controls="tandem-panel" onClick={() => switchTab("duplicates")}>Duplicates</button> : null}
    </div>
    {actionError ? <p className="notice notice-bad" role="alert">{actionError}</p> : null}
    <div id="tandem-panel" role="tabpanel" aria-labelledby={tab === "duplicates" ? "tandem-duplicates-tab" : "tandem-requests-tab"}>
      {tab === "duplicates" ? <DuplicatesView /> : openRef ? (
        <MatchesView refId={openRef} showPrivate={showPrivate} onBack={() => setOpenRef(null)} />
      ) : edit ? (
        <TandemEditor item={edit} onDone={() => { setEdit(null); list.reload(); }} />
      ) : <>
        <div className="admin-filterbar">
          <label><span className="sr-only">Search Tandem requests</span><input aria-label="Search Tandem requests" type="search" value={query} placeholder="Search requests" onChange={(event) => setQuery(event.target.value)} disabled={!showPrivate} /></label>
          <label><span className="sr-only">Viewed status</span><select aria-label="Viewed status" value={viewed} onChange={(event) => setViewed(event.target.value)}><option value="all">All</option><option value="no">Unviewed</option><option value="yes">Viewed</option></select></label>
          <span>{session.capabilities.length} active capabilities</span>
        </div>
        {list.loading ? <Loading /> : list.error || !payload ? <ErrorState error={list.error} onRetry={list.reload} /> : <DataViews items={payload.items} keyFor={(item) => item.ref} columns={["Request", "Languages", "Signals", "Profile", "Status", "Actions"]} renderCells={(item) => [<span><strong>{requestLabel(item)}</strong>{showPrivate && item.email ? <><br/><small>{item.email}</small></> : null}</span>, languageSummary(item), matchSignals(item), showPrivate ? [item.gender, item.occupation, item.countryOfOrigin].filter(Boolean).join(" · ") || "-" : "—", <StatusBadge status={item.isViewed ? "viewed" : "new"} />, actions(item)]} renderCard={card} empty="No tandem requests match these filters." />}
      </>}
    </div>
  </>;
}
