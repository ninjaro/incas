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
  const state = useAsync(() => data.getFormInbox({ type, status, q: query }), [data, type, status, query]);
  const update = async (item: FormInboxEntry, input: { status?: string; isViewed?: boolean }) => { await data.updateFormInbox(item.type, item.id, input); state.reload(); };
  if (state.loading && !state.data) return <Loading />;
  if (state.error || !state.data) return <ErrorState error={state.error} onRetry={state.reload} />;
  const actions = (item: FormInboxEntry) => <div className="form-actions"><select aria-label="Status" value={item.status} onChange={(event) => update(item, { status: event.target.value })}>{STATUSES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select><button type="button" className="btn btn-ghost btn-sm" onClick={() => update(item, { isViewed: !item.isViewed })}>{item.isViewed ? "Mark unread" : "Mark viewed"}</button></div>;
  const card = (item: FormInboxEntry) => <><div className="card-heading"><div><small>{item.publicId} / {item.type}</small><h3>{item.name}</h3></div><StatusBadge status={item.status} /></div><p><a href={`mailto:${item.email}`}>{item.email}</a>{item.phone ? ` / ${item.phone}` : ""}</p><strong>{item.subject}</strong><p>{item.message}</p>{actions(item)}</>;
  return <><PageHeader kicker="Admin" title="Forms inbox" sub="Contact requests and event suggestions share one synchronized data view." /><div className="admin-filterbar"><input type="search" value={query} placeholder="Search name, email, or reference" onChange={(event) => setQuery(event.target.value)} /><select value={type} onChange={(event) => setType(event.target.value)}><option value="">All forms</option><option value="contact">Contact</option><option value="suggestion">Suggestions</option></select><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{STATUSES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></div><DataViews items={state.data.items} keyFor={(item) => `${item.type}-${item.id}`} columns={["Reference", "Contact", "Subject", "Status", "Actions"]} renderCells={(item) => [item.publicId, <span>{item.name}<br/><a href={`mailto:${item.email}`}>{item.email}</a></span>, <span title={item.message}>{item.subject}</span>, <StatusBadge status={item.status} />, actions(item)]} renderCard={card} empty="No matching form submissions." /></>;
}
