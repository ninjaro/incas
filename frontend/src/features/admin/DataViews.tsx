import { useEffect, useState, type ReactNode } from "react";

export type AdminViewMode = "table" | "grid" | "list";

const VIEW_STORAGE_KEY = "incas.admin.view";
const VIEW_EVENT = "incas-admin-view-change";

function readPreferredView(): AdminViewMode {
  const stored = globalThis.localStorage?.getItem?.(VIEW_STORAGE_KEY);
  return stored === "grid" || stored === "list" ? stored : "table";
}

export function DataViews<T>({
  items,
  keyFor,
  columns,
  renderCells,
  renderCard,
  empty,
}: {
  items: T[];
  keyFor: (item: T) => string | number;
  columns: string[];
  renderCells: (item: T) => ReactNode[];
  renderCard: (item: T) => ReactNode;
  empty: ReactNode;
}) {
  const [view, setView] = useState<AdminViewMode>(readPreferredView);
  useEffect(() => {
    const synchronize = (event: Event) => {
      const next = (event as CustomEvent<AdminViewMode>).detail;
      if (next) setView(next);
    };
    window.addEventListener(VIEW_EVENT, synchronize);
    return () => window.removeEventListener(VIEW_EVENT, synchronize);
  }, []);
  const chooseView = (next: AdminViewMode) => {
    globalThis.localStorage?.setItem?.(VIEW_STORAGE_KEY, next);
    setView(next);
    window.dispatchEvent(new CustomEvent(VIEW_EVENT, { detail: next }));
  };
  return (
    <>
      <div className="view-switcher" role="group" aria-label="View mode">
        {(["table", "grid", "list"] as const).map((mode) => <button key={mode} type="button" className="btn btn-ghost btn-sm" aria-pressed={view === mode} onClick={() => chooseView(mode)}>{mode}</button>)}
      </div>
      {!items.length ? <div className="state-box">{empty}</div> : view === "table" ? (
        <div className="table-wrap"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={keyFor(item)}>{renderCells(item).map((cell, index) => <td key={columns[index] ?? index}>{cell}</td>)}</tr>)}</tbody></table></div>
      ) : (
        <div className={`admin-data-${view}`}>{items.map((item) => <article key={keyFor(item)} className="card">{renderCard(item)}</article>)}</div>
      )}
    </>
  );
}
