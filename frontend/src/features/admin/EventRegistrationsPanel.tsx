import { useState } from "react";

import type { EventQueueSummary, EventRegistrationStatus, RegistrationRecord } from "../../api/types";
import { EventRegistrationStatus as RegistrationBadge } from "../../components/events";
import { ConfirmDialog, EmptyState, ErrorState, Loading, PageHeader, statusLabel } from "../../components/ui";
import { useSession } from "../../auth/SessionContext";
import { useData } from "../../data/DataProviderContext";
import { useAsync } from "../../hooks/useAsync";
import { useCurrentLocale } from "../../i18n/LocaleContext";
import { DataViews } from "./DataViews";

const STATUSES: EventRegistrationStatus[] = ["waiting_payment", "approved", "waiting_list", "waiting_refund", "cancelled"];

export function EventRegistrationsPanel() {
  const data = useData();
  const { hasCapability } = useSession();
  const locale = useCurrentLocale();
  const de = locale === "de";
  const canCheckIn = hasCapability("event_registrations_checkin");
  const canSeePrivate = hasCapability("event_registrations_private");
  const canExport = hasCapability("event_registrations_export");
  const queues = useAsync(() => data.getEventQueues(), [data]);
  const [postId, setPostId] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<{ item: RegistrationRecord; next: EventRegistrationStatus } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activePostId = postId ?? queues.data?.events[0]?.postId ?? null;
  const registrations = useAsync<{ event: EventQueueSummary | null; items: RegistrationRecord[] }>(
    () => activePostId
      ? data.getEventRegistrations(activePostId, { status, q: query })
      : Promise.resolve({ event: null, items: [] }),
    [data, activePostId, status, query],
  );

  if (queues.loading && !queues.data) return <Loading />;
  if (queues.error || !queues.data) return <ErrorState error={queues.error} onRetry={queues.reload} />;
  if (!queues.data.events.length || !activePostId) {
    return <><PageHeader kicker="Admin" title={de ? "Eventanmeldungen" : "Event registrations"} /><EmptyState>{de ? "Es gibt noch keine Anmeldelisten." : "No event queues exist yet."}</EmptyState></>;
  }

  const update = async (item: RegistrationRecord, next: EventRegistrationStatus) => {
    if (!item.id || busyId !== null) return;
    setBusyId(item.id);
    setError(null);
    try {
      await data.updateEventRegistration(item.id, next);
      setPending(null);
      registrations.reload();
      queues.reload();
    } catch (reason) {
      setPending(null);
      setError(reason instanceof Error ? reason.message : de ? "Die Anmeldung konnte nicht aktualisiert werden." : "Registration update failed.");
    } finally {
      setBusyId(null);
    }
  };
  const chooseStatus = (item: RegistrationRecord, next: EventRegistrationStatus) => {
    if (next === item.status) return;
    if (next === "cancelled" || next === "waiting_refund") setPending({ item, next });
    else void update(item, next);
  };
  const actions = (item: RegistrationRecord) => {
    if (!canCheckIn) return <RegistrationBadge status={item.status} position={item.waitingListPosition} locale={locale} />;
    const choices = [item.status, ...(item.allowedTransitions ?? [])];
    return <select aria-label={`${de ? "Status für" : "Status for"} ${item.name ?? item.publicId}`} value={item.status} disabled={choices.length === 1 || busyId === item.id} onChange={(event) => chooseStatus(item, event.target.value as EventRegistrationStatus)}>{choices.map((value) => <option key={value} value={value}>{statusLabel(value, locale)}</option>)}</select>;
  };
  const card = (item: RegistrationRecord) => <><small>{item.publicId}</small><h3>{item.name ?? "—"}</h3>{canSeePrivate ? <p>{item.email}<br/>{item.occupation}</p> : null}<RegistrationBadge status={item.status} position={item.waitingListPosition} locale={locale} />{canSeePrivate && item.comment ? <p>{item.comment}</p> : null}{actions(item)}</>;
  const event = registrations.data?.event;
  const columns = canSeePrivate
    ? (de ? ["Anmeldung", "Name", "Kontakt", "Status", "Ändern"] : ["Application", "Name", "Contact", "Status", "Change"])
    : canCheckIn
      ? (de ? ["Anmeldung", "Name", "Status", "Ändern"] : ["Application", "Name", "Status", "Change"])
      : (de ? ["Anmeldung", "Status"] : ["Application", "Status"]);
  const renderCells = (item: RegistrationRecord) => {
    if (canSeePrivate) return [item.publicId, item.name, <a href={`mailto:${item.email}`}>{item.email}</a>, <RegistrationBadge status={item.status} position={item.waitingListPosition} locale={locale} />, actions(item)];
    if (canCheckIn) return [item.publicId, item.name ?? "—", <RegistrationBadge status={item.status} position={item.waitingListPosition} locale={locale} />, actions(item)];
    return [item.publicId, <RegistrationBadge status={item.status} position={item.waitingListPosition} locale={locale} />];
  };

  return <>
    <PageHeader kicker="Admin" title={de ? "Eventanmeldungen" : "Event registrations"} sub={event
      ? (de
        ? `${event.reservedCount}/${event.capacity} reserviert, ${event.waitingListCount} auf der Warteliste, ${event.placesRemaining} Plätze frei`
        : `${event.reservedCount}/${event.capacity} reserved, ${event.waitingListCount} waiting, ${event.placesRemaining} places remaining`)
      : (de ? "Anmeldeliste eines Events laden und verwalten." : "Load and manage an event registration queue.")} />
    <div className="admin-filterbar">
      <label><span className="sr-only">{de ? "Anmeldeliste" : "Event queue"}</span><select aria-label={de ? "Anmeldeliste" : "Event queue"} value={activePostId} onChange={(event) => setPostId(Number(event.target.value))}>{queues.data.events.map((queue) => <option key={queue.postId} value={queue.postId}>{queue.title} ({queue.startsAt?.slice(0, 10)})</option>)}</select></label>
      <label><span className="sr-only">{de ? "Anmeldungen durchsuchen" : "Search registrations"}</span><input aria-label={de ? "Anmeldungen durchsuchen" : "Search registrations"} type="search" value={query} placeholder={de ? "Name oder Anmelde-ID suchen" : "Search name or application ID"} onChange={(event) => setQuery(event.target.value)} /></label>
      <label><span className="sr-only">{de ? "Anmeldestatus" : "Registration status"}</span><select aria-label={de ? "Anmeldestatus" : "Registration status"} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{de ? "Alle Status" : "All statuses"}</option>{STATUSES.map((value) => <option key={value} value={value}>{statusLabel(value, locale)}</option>)}</select></label>
      {canExport ? <a className="btn btn-outline btn-sm" href={`/api/v1/admin/events/${activePostId}/registrations.csv`}>{de ? "CSV exportieren" : "Export CSV"}</a> : null}
    </div>
    {error ? <p className="notice notice-bad" role="alert">{error}</p> : null}
    {registrations.loading ? <Loading /> : registrations.error || !registrations.data || !event ? (
      <ErrorState error={registrations.error} onRetry={registrations.reload} />
    ) : <DataViews items={registrations.data.items} keyFor={(item) => item.publicId} columns={columns} renderCells={renderCells} renderCard={card} empty={de ? "Keine passenden Anmeldungen." : "No matching applications."} />}
    <ConfirmDialog
      open={pending !== null}
      title={pending?.next === "waiting_refund"
        ? (de ? "Rückzahlung anfordern?" : "Request a refund?")
        : (de ? "Diese Anmeldung stornieren?" : "Cancel this registration?")}
      body={pending
        ? (de
          ? `${pending.item.name} (${pending.item.publicId}) wechselt zu „${statusLabel(pending.next, locale)}“.`
          : `${pending.item.name} (${pending.item.publicId}) will move to ${statusLabel(pending.next, locale)}.`)
        : undefined}
      confirmLabel={busyId
        ? (de ? "Wird aktualisiert…" : "Updating…")
        : pending?.next === "waiting_refund"
          ? (de ? "Als „wartet auf Rückzahlung“ markieren" : "Mark waiting for refund")
          : (de ? "Anmeldung stornieren" : "Cancel registration")}
      danger
      onConfirm={() => pending && void update(pending.item, pending.next)}
      onCancel={() => !busyId && setPending(null)}
    />
  </>;
}
