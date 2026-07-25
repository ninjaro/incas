import { useState, type DragEvent } from "react";

import type { KaraokeAction, KaraokeAdminEntry, KaraokeStatus } from "../../api/types";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  StatusBadge,
} from "../../components/ui";
import { useData } from "../../data/DataProviderContext";
import { useAsync } from "../../hooks/useAsync";

const STATUS_FILTERS: (KaraokeStatus | "all")[] = [
  "all",
  "pending",
  "approved",
  "performing",
  "completed",
  "rejected",
  "cancelled",
];

function RowActions({
  entry,
  onAction,
}: {
  entry: KaraokeAdminEntry;
  onAction: (entry: KaraokeAdminEntry, action: KaraokeAction) => void;
}) {
  const actions: { action: KaraokeAction; label: string; when: KaraokeStatus[] }[] = [
    { action: "approve", label: "Approve", when: ["pending"] },
    { action: "reject", label: "Reject", when: ["pending"] },
    { action: "performing", label: "On stage", when: ["approved"] },
    { action: "complete", label: "Done", when: ["performing", "approved"] },
    { action: "cancel", label: "Cancel", when: ["pending", "approved", "performing"] },
    { action: "restore", label: "Restore", when: ["cancelled", "rejected"] },
  ];

  return (
    <div className="queue-actions">
      {actions
        .filter((item) => item.when.includes(entry.status))
        .map((item) => (
          <button
            key={item.action}
            type="button"
            className={`btn btn-sm ${item.action === "approve" ? "btn-primary" : "btn-outline"}`}
            onClick={() => onAction(entry, item.action)}
          >
            {item.label}
          </button>
        ))}
    </div>
  );
}

function AuditTab() {
  const data = useData();
  const audit = useAsync(() => data.getKaraokeAudit(), []);

  if (audit.loading) return <Loading />;
  if (audit.error) return <ErrorState error={audit.error} onRetry={audit.reload} />;
  const entries = audit.data?.entries ?? [];
  if (entries.length === 0) return <EmptyState>No audit entries yet.</EmptyState>;

  return (
    <div className="table-wrap"><table className="table">
      <thead>
        <tr>
          <th>When</th>
          <th>Request</th>
          <th>Action</th>
          <th>Detail</th>
          <th>Session</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, index) => (
          <tr key={index}>
            <td>{new Date(entry.createdAt).toLocaleString()}</td>
            <td>#{entry.requestId}</td>
            <td>{entry.action}</td>
            <td>{entry.detail}</td>
            <td>
              <code>{entry.actor}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </table></div>
  );
}

export function KaraokePanel() {
  const data = useData();
  const [filter, setFilter] = useState<KaraokeStatus | "all">("all");
  const [tab, setTab] = useState<"queue" | "audit">("queue");
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<KaraokeAdminEntry | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [eventSlug, setEventSlug] = useState("");

  const overview = useAsync(() => data.getAdminKaraoke(), [data]);
  const activeEvent = eventSlug
    || overview.data?.items.find((item) => item.eventSlug)?.eventSlug
    || overview.data?.events[0]?.slug
    || "";
  const list = useAsync(
    () => activeEvent
      ? data.getAdminKaraoke(filter === "all" ? undefined : filter, activeEvent)
      : Promise.resolve({ items: [], events: [] }),
    [data, filter, activeEvent],
  );
  const fullQueue = useAsync(
    () => activeEvent
      ? data.getAdminKaraoke(undefined, activeEvent)
      : Promise.resolve({ items: [], events: [] }),
    [data, activeEvent],
  );

  const runAction = async (entry: KaraokeAdminEntry, action: KaraokeAction) => {
    if (action === "cancel") {
      setConfirmCancel(entry);
      return;
    }
    await applyAction(entry, action);
  };

  const applyAction = async (entry: KaraokeAdminEntry, action: KaraokeAction) => {
    setNotice(null);
    setConfirmCancel(null);
    try {
      await data.karaokeAction(entry.id, action);
      list.reload();
      fullQueue.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action failed.");
      list.reload();
    }
  };

  const queueItems = (fullQueue.data?.items ?? []).filter(
    (item) => item.status === "approved" || item.status === "performing",
  );

  const move = async (entry: KaraokeAdminEntry, delta: number) => {
    const order = queueItems.map((item) => item.id);
    const index = order.indexOf(entry.id);
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    await reorder(order);
  };

  const reorder = async (order: number[]) => {
    setNotice(null);
    try {
      await data.reorderKaraoke(order);
      list.reload();
      fullQueue.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Reorder failed.");
      list.reload();
    }
  };

  const onDrop = (event: DragEvent, targetId: number) => {
    event.preventDefault();
    if (dragId === null || dragId === targetId) return;
    const order = queueItems.map((item) => item.id);
    const from = order.indexOf(dragId);
    const to = order.indexOf(targetId);
    order.splice(from, 1);
    order.splice(to, 0, dragId);
    setDragId(null);
    void reorder(order);
  };

  if (overview.loading) return <Loading label="Loading Karaoke events…" />;
  if (overview.error || !overview.data) return <ErrorState error={overview.error} onRetry={overview.reload} />;
  if (!overview.data.events.length) {
    return <><PageHeader kicker="Live event" title="Karaoke Queue" sub="Approve and order requests for a Karaoke event." /><EmptyState>No Karaoke events are available.</EmptyState></>;
  }

  return (
    <>
      <PageHeader
        kicker="Live event"
        title="Karaoke Queue"
        sub="Approve requests into the live queue, reorder by drag and drop, and mark songs as performing or done."
      />
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "queue"} onClick={() => setTab("queue")}>
          Requests
        </button>
        <button type="button" role="tab" aria-selected={tab === "audit"} onClick={() => setTab("audit")}>
          Audit
        </button>
      </div>
      {notice ? <p className="notice notice-bad">{notice}</p> : null}
      {tab === "audit" ? (
        <AuditTab />
      ) : (
        <>
          <div className="admin-filterbar">
            <label><span className="sr-only">Karaoke event</span><select aria-label="Karaoke event" value={activeEvent} onChange={(event) => setEventSlug(event.target.value)}>
              {(overview.data?.events ?? []).map((event) => <option key={event.slug} value={event.slug}>{event.title} ({event.startsAt?.slice(0, 10)})</option>)}
            </select></label>
            <div className="filter-buttons" role="group" aria-label="Request status">{STATUS_FILTERS.map((status) => (
              <button
                key={status}
                type="button"
                className={`btn btn-sm ${filter === status ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setFilter(status)}
              >
                {status}
              </button>
            ))}</div>
          </div>
          {list.loading ? (
            <Loading />
          ) : list.error ? (
            <ErrorState error={list.error} onRetry={list.reload} />
          ) : (list.data?.items ?? []).length === 0 ? (
            <EmptyState>No requests with this status.</EmptyState>
          ) : (
            (list.data?.items ?? []).map((entry) => {
              const inQueue = entry.status === "approved" || entry.status === "performing";
              const queueIndex = queueItems.findIndex((item) => item.id === entry.id);
              return (
                <div
                  key={entry.id}
                  className={`queue-row${entry.status === "performing" ? " is-performing" : ""}`}
                  draggable={inQueue}
                  onDragStart={() => setDragId(entry.id)}
                  onDragOver={(event) => inQueue && event.preventDefault()}
                  onDrop={(event) => inQueue && onDrop(event, entry.id)}
                >
                  {inQueue ? <span className="queue-pos">{entry.position}</span> : null}
                  <div className="queue-song">
                    <strong>{entry.songTitle}</strong>
                    <span>
                      {entry.artist ? `${entry.artist} · ` : ""}
                      {entry.displayName}
                      {entry.eventTitle ? ` · ${entry.eventTitle}` : ""}
                      {entry.note ? ` · “${entry.note}”` : ""}
                    </span>
                  </div>
                  <StatusBadge status={entry.status} />
                  {inQueue ? (
                    <span style={{ display: "inline-flex", gap: 2 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        aria-label={`Move ${entry.songTitle} up`}
                        disabled={fullQueue.loading || queueIndex <= 0}
                        onClick={() => move(entry, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        aria-label={`Move ${entry.songTitle} down`}
                        disabled={fullQueue.loading || queueIndex < 0 || queueIndex === queueItems.length - 1}
                        onClick={() => move(entry, 1)}
                      >
                        ↓
                      </button>
                    </span>
                  ) : null}
                  <RowActions entry={entry} onAction={runAction} />
                </div>
              );
            })
          )}
        </>
      )}
      <ConfirmDialog
        open={confirmCancel !== null}
        title="Cancel this request?"
        body={
          confirmCancel
            ? `"${confirmCancel.songTitle}" by ${confirmCancel.displayName} will leave the queue. It can be restored later.`
            : undefined
        }
        confirmLabel="Cancel request"
        danger
        onConfirm={() => confirmCancel && applyAction(confirmCancel, "cancel")}
        onCancel={() => setConfirmCancel(null)}
      />
    </>
  );
}
