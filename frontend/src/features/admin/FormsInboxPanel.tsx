import { useState } from "react";

import type { FormInboxEntry } from "../../api/types";
import { ErrorState, Loading, PageHeader, StatusBadge, statusLabel } from "../../components/ui";
import { useData } from "../../data/DataProviderContext";
import { useAsync } from "../../hooks/useAsync";
import { useCurrentLocale } from "../../i18n/LocaleContext";
import { DataViews } from "./DataViews";

const STATUSES = ["new", "in_progress", "resolved", "archived"];

export function FormsInboxPanel() {
  const data = useData();
  const locale = useCurrentLocale();
  const de = locale === "de";
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
      setError(reason instanceof Error ? reason.message : de ? "Das Formular konnte nicht aktualisiert werden." : "Form update failed.");
    } finally {
      setBusyId(null);
    }
  };
  const actions = (item: FormInboxEntry) => {
    const busy = busyId === `${item.type}-${item.id}`;
    return <div className="form-actions"><select aria-label={`${de ? "Status für" : "Status for"} ${item.name}`} value={item.status} disabled={busy} onChange={(event) => void update(item, { status: event.target.value })}>{STATUSES.map((value) => <option key={value} value={value}>{statusLabel(value, locale)}</option>)}</select><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void update(item, { isViewed: !item.isViewed })}>{item.isViewed ? (de ? "Als ungelesen markieren" : "Mark unread") : (de ? "Als gesehen markieren" : "Mark viewed")}</button></div>;
  };
  const typeLabel = (value: string) => de
    ? value === "contact" ? "Kontakt" : value === "suggestion" ? "Vorschlag" : value
    : value;
  const card = (item: FormInboxEntry) => <><div className="card-heading"><div><small>{item.publicId} / {typeLabel(item.type)}</small><h3>{item.name || (item.redacted ? (de ? "(verborgen – benötigt Zugriff auf alle Details)" : "(hidden — needs full-detail access)") : "—")}</h3></div><StatusBadge status={item.status} /></div>{item.redacted ? <p><em>{item.email}</em></p> : <p><a href={`mailto:${item.email}`}>{item.email}</a>{item.phone ? ` / ${item.phone}` : ""}</p>}<strong>{item.subject}</strong>{item.message ? <p>{item.message}</p> : null}{actions(item)}</>;

  return <>
    <PageHeader kicker="Admin" title={de ? "Formular-Eingang" : "Forms inbox"} sub={de ? "Kontaktanfragen und Eventvorschläge in einer gemeinsamen Ansicht." : "Contact requests and event suggestions share one synchronized data view."} />
    <div className="admin-filterbar">
      <label><span className="sr-only">{de ? "Formulare durchsuchen" : "Search forms"}</span><input aria-label={de ? "Formulare durchsuchen" : "Search forms"} type="search" value={query} placeholder={de ? "Name, E-Mail oder Referenz suchen" : "Search name, email, or reference"} onChange={(event) => setQuery(event.target.value)} /></label>
      <label><span className="sr-only">{de ? "Formulartyp" : "Form type"}</span><select aria-label={de ? "Formulartyp" : "Form type"} value={type} onChange={(event) => setType(event.target.value)}><option value="">{de ? "Alle Formulare" : "All forms"}</option><option value="contact">{de ? "Kontakt" : "Contact"}</option><option value="suggestion">{de ? "Vorschläge" : "Suggestions"}</option></select></label>
      <label><span className="sr-only">{de ? "Formularstatus" : "Form status"}</span><select aria-label={de ? "Formularstatus" : "Form status"} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{de ? "Alle Status" : "All statuses"}</option>{STATUSES.map((value) => <option key={value} value={value}>{statusLabel(value, locale)}</option>)}</select></label>
    </div>
    {error ? <p className="notice notice-bad" role="alert">{error}</p> : null}
    {state.loading ? <Loading /> : state.error || !state.data ? <ErrorState error={state.error} onRetry={state.reload} /> : <DataViews items={state.data.items} keyFor={(item) => `${item.type}-${item.id}`} columns={de ? ["Referenz", "Kontakt", "Betreff", "Status", "Aktionen"] : ["Reference", "Contact", "Subject", "Status", "Actions"]} renderCells={(item) => [item.publicId, <span>{item.name || "—"}<br/>{item.redacted ? <em>{item.email}</em> : <a href={`mailto:${item.email}`}>{item.email}</a>}</span>, <span title={item.message}>{item.subject}</span>, <StatusBadge status={item.status} />, actions(item)]} renderCard={card} empty={de ? "Keine passenden Einsendungen." : "No matching form submissions."} />}
  </>;
}
