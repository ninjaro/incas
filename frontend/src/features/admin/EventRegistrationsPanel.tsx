import { useState } from "react";

import type { EventQueueSummary, EventRegistrationStatus, RegistrationRecord } from "../../api/types";
import { EventRegistrationStatus as RegistrationBadge } from "../../components/events";
import { EmptyState, ErrorState, Loading, PageHeader } from "../../components/ui";
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
  const activePostId = postId ?? queues.data?.events[0]?.postId ?? null;
  const registrations = useAsync<{ event: EventQueueSummary | null; items: RegistrationRecord[] }>(
    () => activePostId ? data.getEventRegistrations(activePostId, { status, q: query }) : Promise.resolve({ event: null, items: [] }),
    [data, activePostId, status, query],
  );
  if (queues.loading && !queues.data) return <Loading />;
  if (queues.error || !queues.data) return <ErrorState error={queues.error} onRetry={queues.reload} />;
  if (!queues.data.events.length || !activePostId) return <><PageHeader kicker="Admin" title="Event registrations" /><EmptyState>No event queues exist yet.</EmptyState></>;
  if (registrations.loading && !registrations.data) return <Loading />;
  if (registrations.error || !registrations.data || !registrations.data.event) return <ErrorState error={registrations.error} onRetry={registrations.reload} />;
  const event = registrations.data.event;
  const update = async (item: RegistrationRecord, next: EventRegistrationStatus) => { if (item.id) { await data.updateEventRegistration(item.id, next); registrations.reload(); queues.reload(); } };
  const actions = (item: RegistrationRecord) => <select aria-label={`Status for ${item.name}`} value={item.status} onChange={(event) => update(item, event.target.value as EventRegistrationStatus)}>{STATUSES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>;
  const card = (item: RegistrationRecord) => <><small>{item.publicId}</small><h3>{item.name}</h3><p>{item.email}<br/>{item.occupation}</p><RegistrationBadge status={item.status} position={item.waitingListPosition} />{item.comment ? <p>{item.comment}</p> : null}{actions(item)}</>;
  return <><PageHeader kicker="Admin" title="Event registrations" sub={`${event.reservedCount}/${event.capacity} reserved, ${event.waitingListCount} waiting, ${event.placesRemaining} places remaining`} /><div className="admin-filterbar"><select value={activePostId} onChange={(event) => setPostId(Number(event.target.value))}>{queues.data.events.map((queue) => <option key={queue.postId} value={queue.postId}>{queue.title} ({queue.startsAt?.slice(0, 10)})</option>)}</select><input type="search" value={query} placeholder="Search name or application ID" onChange={(event) => setQuery(event.target.value)} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{STATUSES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select><a className="btn btn-outline btn-sm" href={`/api/v1/admin/events/${activePostId}/registrations.csv`}>Export CSV</a></div><DataViews items={registrations.data.items} keyFor={(item) => item.publicId} columns={["Application", "Name", "Contact", "Status", "Change"]} renderCells={(item) => [item.publicId, item.name, <a href={`mailto:${item.email}`}>{item.email}</a>, <RegistrationBadge status={item.status} position={item.waitingListPosition} />, actions(item)]} renderCard={card} empty="No matching applications." /></>;
}
