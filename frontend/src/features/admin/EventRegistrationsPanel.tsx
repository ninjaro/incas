import { useState } from "react";

import type { EventQueueSummary, EventRegistrationStatus, RegistrationRecord } from "../../api/types";
import { EventRegistrationStatus as RegistrationBadge } from "../../components/events";
import { ConfirmDialog, EmptyState, ErrorState, Loading, PageHeader } from "../../components/ui";
import { useData } from "../../data/DataProviderContext";
import { useAsync } from "../../hooks/useAsync";
import { DataViews } from "./DataViews";

const STATUSES: EventRegistrationStatus[] = ["waiting_payment", "approved", "waiting_list", "waiting_refund", "cancelled"];

export function EventRegistrationsPanel() {
  const data = useData();
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
    return <><PageHeader kicker="Admin" title="Event registrations" /><EmptyState>No event queues exist yet.</EmptyState></>;
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
      setError(reason instanceof Error ? reason.message : "Registration update failed.");
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
    const choices = [item.status, ...(item.allowedTransitions ?? [])];
    return <select aria-label={`Status for ${item.name}`} value={item.status} disabled={choices.length === 1 || busyId === item.id} onChange={(event) => chooseStatus(item, event.target.value as EventRegistrationStatus)}>{choices.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>;
  };
  const card = (item: RegistrationRecord) => <><small>{item.publicId}</small><h3>{item.name}</h3><p>{item.email}<br/>{item.occupation}</p><RegistrationBadge status={item.status} position={item.waitingListPosition} />{item.comment ? <p>{item.comment}</p> : null}{actions(item)}</>;
  const event = registrations.data?.event;

  return <>
    <PageHeader kicker="Admin" title="Event registrations" sub={event ? `${event.reservedCount}/${event.capacity} reserved, ${event.waitingListCount} waiting, ${event.placesRemaining} places remaining` : "Load and manage an event registration queue."} />
    <div className="admin-filterbar">
      <label><span className="sr-only">Event queue</span><select aria-label="Event queue" value={activePostId} onChange={(event) => setPostId(Number(event.target.value))}>{queues.data.events.map((queue) => <option key={queue.postId} value={queue.postId}>{queue.title} ({queue.startsAt?.slice(0, 10)})</option>)}</select></label>
      <label><span className="sr-only">Search registrations</span><input aria-label="Search registrations" type="search" value={query} placeholder="Search name or application ID" onChange={(event) => setQuery(event.target.value)} /></label>
      <label><span className="sr-only">Registration status</span><select aria-label="Registration status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{STATUSES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
      <a className="btn btn-outline btn-sm" href={`/api/v1/admin/events/${activePostId}/registrations.csv`}>Export CSV</a>
    </div>
    {error ? <p className="notice notice-bad" role="alert">{error}</p> : null}
    {registrations.loading ? <Loading /> : registrations.error || !registrations.data || !event ? (
      <ErrorState error={registrations.error} onRetry={registrations.reload} />
    ) : <DataViews items={registrations.data.items} keyFor={(item) => item.publicId} columns={["Application", "Name", "Contact", "Status", "Change"]} renderCells={(item) => [item.publicId, item.name, <a href={`mailto:${item.email}`}>{item.email}</a>, <RegistrationBadge status={item.status} position={item.waitingListPosition} />, actions(item)]} renderCard={card} empty="No matching applications." />}
    <ConfirmDialog
      open={pending !== null}
      title={pending?.next === "waiting_refund" ? "Request a refund?" : "Cancel this registration?"}
      body={pending ? `${pending.item.name} (${pending.item.publicId}) will move to ${pending.next.replaceAll("_", " ")}.` : undefined}
      confirmLabel={busyId ? "Updating…" : pending?.next === "waiting_refund" ? "Mark waiting for refund" : "Cancel registration"}
      danger
      onConfirm={() => pending && void update(pending.item, pending.next)}
      onCancel={() => !busyId && setPending(null)}
    />
  </>;
}
