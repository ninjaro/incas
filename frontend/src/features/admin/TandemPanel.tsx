import { useState } from "react";

import type { TandemMatch, TandemRequest, TandemReviewAction } from "../../api/types";
import { EmptyState, ErrorState, Loading, PageHeader, StatusBadge } from "../../components/ui";
import { useSession } from "../../auth/SessionContext";
import { useData } from "../../data/DataProviderContext";
import { useAsync } from "../../hooks/useAsync";
import { DataViews } from "./DataViews";

function requestLabel(item: TandemRequest) {
  return item.firstName || item.lastName ? `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() : `Request ${item.ref.slice(0, 6).toUpperCase()}`;
}
function languageSummary(item: TandemRequest) {
  return `${item.offeredLanguages.join(", ").toUpperCase() || "-"} -> ${item.requestedLanguages.join(", ").toUpperCase() || "-"}`;
}

function MatchGroup({ title, matches, sourceRef, showPrivate, reload }: { title: string; matches: TandemMatch[]; sourceRef: string; showPrivate: boolean; reload: () => void }) {
  const data = useData();
  if (!matches.length) return null;
  const act = async (candidateRef: string, action: TandemReviewAction) => { await data.reviewTandemMatch(sourceRef, candidateRef, action); reload(); };
  return <section className="tandem-match-group"><h3>{title}</h3>{matches.map((match) => <article key={match.candidate.ref} className={`card tandem-match${match.review.hidden ? " is-muted" : ""}`}><div><strong>{requestLabel(match.candidate)}</strong><p>{languageSummary(match.candidate)}{showPrivate && match.candidate.email ? ` / ${match.candidate.email}` : ""}</p><small>{match.reasons.join("; ")}</small></div><div className="capability-chips"><StatusBadge status={match.category} /><span className="badge badge-neutral">score {match.score}</span>{match.review.shortlisted ? <span className="badge badge-brand">shortlisted</span> : null}{match.review.contactedAt ? <span className="badge badge-info">contacted</span> : null}{match.review.finalPairAt ? <span className="badge badge-ok">final pair</span> : null}</div><div className="form-actions"><button type="button" className="btn btn-ghost btn-sm" onClick={() => act(match.candidate.ref, match.review.hidden ? "show" : "hide")}>{match.review.hidden ? "Show" : "Hide"}</button><button type="button" className="btn btn-outline btn-sm" onClick={() => act(match.candidate.ref, match.review.shortlisted ? "unshortlist" : "shortlist")}>{match.review.shortlisted ? "Remove shortlist" : "Shortlist"}</button>{showPrivate ? <><button type="button" className="btn btn-outline btn-sm" onClick={() => act(match.candidate.ref, match.review.contactedAt ? "uncontacted" : "contacted")}>{match.review.contactedAt ? "Undo contacted" : "Contacted"}</button><button type="button" className="btn btn-primary btn-sm" onClick={() => act(match.candidate.ref, match.review.finalPairAt ? "unpair" : "final_pair")}>{match.review.finalPairAt ? "Undo pair" : "Final pair"}</button></> : null}</div></article>)}</section>;
}

function MatchesView({ refId, showPrivate, onBack }: { refId: string; showPrivate: boolean; onBack: () => void }) {
  const data = useData();
  const state = useAsync(() => data.getTandemMatches(refId), [data, refId]);
  if (state.loading) return <Loading />;
  if (state.error || !state.data) return <ErrorState error={state.error} onRetry={state.reload} />;
  const payload = state.data;
  const total = Object.values(payload.groups).reduce((sum, list) => sum + list.length, 0);
  return <><button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>Back to all requests</button><div className="card tandem-source"><h2>Matches for {requestLabel(payload.source)}</h2><p>{languageSummary(payload.source)}</p></div>{total ? <><MatchGroup title="Full matches" matches={payload.groups.full ?? []} sourceRef={refId} showPrivate={showPrivate} reload={state.reload} /><MatchGroup title="Partial matches" matches={payload.groups.partial ?? []} sourceRef={refId} showPrivate={showPrivate} reload={state.reload} /><MatchGroup title="Weak matches" matches={payload.groups.weak ?? []} sourceRef={refId} showPrivate={showPrivate} reload={state.reload} /></> : <EmptyState>No matching partners found yet.</EmptyState>}</>;
}

function DuplicatesView() {
  const data = useData();
  const state = useAsync(() => data.getTandemDuplicates(), [data]);
  if (state.loading) return <Loading />;
  if (state.error || !state.data) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (!state.data.items.length) return <EmptyState>No unresolved likely duplicates.</EmptyState>;
  return <div className="admin-data-list">{state.data.items.map((item) => <article className="card" key={`${item.left.ref}-${item.right.ref}`}><h3>{requestLabel(item.left)} / {requestLabel(item.right)}</h3><p>{item.reasons.join("; ")}</p><div className="capability-chips"><StatusBadge status={item.category} /><span className="badge badge-neutral">score {item.score}</span></div><div className="form-actions"><button className="btn btn-outline btn-sm" type="button" onClick={async () => { await data.decideTandemDuplicate(item.left.ref, item.right.ref, "different"); state.reload(); }}>Different people</button><button className="btn btn-ghost btn-sm" type="button" onClick={async () => { await data.decideTandemDuplicate(item.left.ref, item.right.ref, "ignore"); state.reload(); }}>Ignore</button><button className="btn btn-danger btn-sm" type="button" onClick={async () => { await data.mergeTandemDuplicate(item.left.ref, item.right.ref); state.reload(); }}>Merge into first</button></div></article>)}</div>;
}

function TandemEditor({ item, onDone }: { item: TandemRequest; onDone: () => void }) {
  const data = useData();
  const [form, setForm] = useState({ firstName: item.firstName ?? "", lastName: item.lastName ?? "", email: item.email ?? "", occupation: item.occupation, comment: item.comment ?? "" });
  const save = async () => { await data.updateTandem(item.ref, form); onDone(); };
  return <div className="card public-form"><h2>Edit {requestLabel(item)}</h2><div className="form-grid"><label>First name<input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label><label>Last name<input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label><label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Occupation<input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} /></label></div><label>Comment<textarea rows={5} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} /></label><div className="form-actions"><button className="btn btn-primary" type="button" onClick={save}>Save</button><button className="btn btn-ghost" type="button" onClick={onDone}>Cancel</button></div></div>;
}

export function TandemPanel() {
  const data = useData();
  const session = useSession();
  const [query, setQuery] = useState("");
  const [viewed, setViewed] = useState("all");
  const [tab, setTab] = useState<"requests" | "duplicates">("requests");
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [edit, setEdit] = useState<TandemRequest | null>(null);
  const list = useAsync(() => data.getTandemRequests({ q: query, viewed }), [data, query, viewed]);
  if (list.loading && !list.data) return <Loading />;
  if (list.error || !list.data) return <ErrorState error={list.error} onRetry={list.reload} />;
  const payload = list.data;
  const showPrivate = payload.capabilities.private;
  const canCorrect = payload.capabilities.corrections;
  const actions = (item: TandemRequest) => <div className="form-actions"><button type="button" className="btn btn-outline btn-sm" onClick={() => setOpenRef(item.ref)}>Matches</button><button type="button" className="btn btn-ghost btn-sm" onClick={async () => { await data.markTandemViewed(item.ref, !item.isViewed); list.reload(); }}>{item.isViewed ? "Unread" : "Viewed"}</button>{canCorrect ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit(item)}>Edit</button> : null}</div>;
  const card = (item: TandemRequest) => <><small>{item.ref}</small><h3>{requestLabel(item)}</h3><p>{languageSummary(item)}</p><p>{item.countryOfOrigin} / {item.occupation}</p>{showPrivate && item.email ? <a href={`mailto:${item.email}`}>{item.email}</a> : null}{actions(item)}</>;
  return <><PageHeader kicker="Language exchange" title="Language Tandem" sub={showPrivate ? "Private contact details are available for matching." : "Blind mode: personal details are withheld by the API."} />{!showPrivate ? <p className="notice notice-info">Contact details are hidden at the API level. Activate a stronger key to reveal them.</p> : null}<div className="tabs"><button type="button" aria-selected={tab === "requests"} onClick={() => setTab("requests")}>Requests</button>{canCorrect ? <button type="button" aria-selected={tab === "duplicates"} onClick={() => setTab("duplicates")}>Duplicates</button> : null}</div>{tab === "duplicates" ? <DuplicatesView /> : openRef ? <MatchesView refId={openRef} showPrivate={showPrivate} onBack={() => setOpenRef(null)} /> : edit ? <TandemEditor item={edit} onDone={() => { setEdit(null); list.reload(); }} /> : <><div className="admin-filterbar"><input type="search" value={query} placeholder="Search requests" onChange={(event) => setQuery(event.target.value)} disabled={!showPrivate} /><select value={viewed} onChange={(event) => setViewed(event.target.value)}><option value="all">All</option><option value="no">Unviewed</option><option value="yes">Viewed</option></select><span>{session.capabilities.length} active capabilities</span></div><DataViews items={payload.items} keyFor={(item) => item.ref} columns={["Request", "Languages", "Profile", "Origin", "Status", "Actions"]} renderCells={(item) => [<span><strong>{requestLabel(item)}</strong>{showPrivate && item.email ? <><br/><small>{item.email}</small></> : null}</span>, languageSummary(item), `${item.gender}, ${new Date().getFullYear() - item.birthYear}`, item.countryOfOrigin, <StatusBadge status={item.isViewed ? "viewed" : "new"} />, actions(item)]} renderCard={card} empty="No tandem requests match these filters." /></>}</>;
}
