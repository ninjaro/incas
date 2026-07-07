import { useEffect, useRef, type ReactNode } from "react";

export function PageHeader({
  kicker,
  title,
  sub,
  actions,
}: {
  kicker?: string;
  title: string;
  sub?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="page-header-row">
        <div>
          {kicker ? <p className="page-kicker">{kicker}</p> : null}
          <h1>{title}</h1>
          {sub ? <p className="page-sub">{sub}</p> : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
    </header>
  );
}

const BADGE_TONES: Record<string, string> = {
  draft: "badge-neutral",
  scheduled: "badge-info",
  published: "badge-ok",
  archived: "badge-neutral",
  pending: "badge-warn",
  approved: "badge-ok",
  performing: "badge-brand",
  completed: "badge-neutral",
  rejected: "badge-bad",
  cancelled: "badge-bad",
  failed: "badge-bad",
  paid: "badge-ok",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${BADGE_TONES[status] ?? "badge-neutral"}`}>{status}</span>;
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="state-box" role="status" aria-live="polite">
      {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div className="state-box state-error" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="state-box">{children}</div>;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h2>{title}</h2>
        {body ? <p>{body}</p> : null}
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label>
        {label}
        {children}
      </label>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
