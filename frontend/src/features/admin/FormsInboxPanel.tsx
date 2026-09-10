import { useState } from "react";

import type { FormInboxEntry } from "../../api/types";
import { ErrorState, Loading, PageHeader, StatusBadge } from "../../components/ui";
import { useData } from "../../data/DataProviderContext";
import { useAsync } from "../../hooks/useAsync";
import { DataViews } from "./DataViews";

const STATUSES = ["new", "in_progress", "resolved", "archived"];

export function FormsInboxPanel() {
  const data = useData();
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const state = useAsync(() => data.getFormInbox({ type, status, q: query }), [data, type, status, query]);
  const update = async (item: FormInboxEntry, input: { status?: string; isViewed?: boolean }) => {
    const key = `${item.type}-${item.id}`;
    setBusyId(key);
    setError(null);
    try {
      await data.updateFormInbox(item.type, item.id, input);
      state.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Form update failed.");
    } finally {
      setBusyId(null);
    }
  };
  const actions = (item: FormInboxEntry) => {
    const busy = busyId === `${item.type}-${item.id}`;
    return <div className="form-actions"><select aria-label={`Status for ${item.name}`} value={item.status} disabled={busy} onChange={(event) => void update(item, { status: event.target.value })}>{STATUSES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void update(item, { isViewed: !item.isViewed })}>{item.isViewed ? "Mark unread" : "Mark viewed"}</button></div>;
  };
  const card = (item: FormInboxEntry) => <><div className="card-heading"><div><small>{item.publicId} / {item.type}</small><h3>{item.name || (item.redacted ? "(hidden — needs full-detail access)" : "—")}</h3></div><StatusBadge status={item.status} /></div>{item.redacted ? <p><em>{item.email}</em></p> : <p><a href={`mailto:${item.email}`}>{item.email}</a>{item.phone ? ` / ${item.phone}` : ""}</p>}<strong>{item.subject}</strong>{item.message ? <p>{item.message}</p> : null}{actions(item)}</>;

  return <>
    <PageHeader kicker="Admin" title="Forms inbox" sub="Contact requests and event suggestions share one synchronized data view." />
    <div className="admin-filterbar">
      <label><span className="sr-only">Search forms</span><input aria-label="Search forms" type="search" value={query} placeholder="Search name, email, or reference" onChange={(event) => setQuery(event.target.value)} /></label>
      <label><span className="sr-only">Form type</span><select aria-label="Form type" value={type} onChange={(event) => setType(event.target.value)}><option value="">All forms</option><option value="contact">Contact</option><option value="suggestion">Suggestions</option></select></label>
      <label><span className="sr-only">Form status</span><select aria-label="Form status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{STATUSES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
    </div>
    {error ? <p className="notice notice-bad" role="alert">{error}</p> : null}
    {state.loading ? <Loading /> : state.error || !state.data ? <ErrorState error={state.error} onRetry={state.reload} /> : <DataViews items={state.data.items} keyFor={(item) => `${item.type}-${item.id}`} columns={["Reference", "Contact", "Subject", "Status", "Actions"]} renderCells={(item) => [item.publicId, <span>{item.name || "—"}<br/>{item.redacted ? <em>{item.email}</em> : <a href={`mailto:${item.email}`}>{item.email}</a>}</span>, <span title={item.message}>{item.subject}</span>, <StatusBadge status={item.status} />, actions(item)]} renderCard={card} empty="No matching form submissions." />}
  </>;
}
