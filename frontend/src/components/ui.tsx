import { cloneElement, isValidElement, useEffect, useId, useRef, type ReactElement, type ReactNode } from "react";

import { useCurrentLocale } from "../i18n/LocaleContext";

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
  active: "badge-ok",
  expired: "badge-warn",
  revoked: "badge-bad",
  refund_pending: "badge-warn",
  refunded: "badge-ok",
  waiting_payment: "badge-warn",
  waiting_list: "badge-info",
  waiting_refund: "badge-warn",
  viewed: "badge-info",
  new: "badge-brand",
  in_progress: "badge-info",
  resolved: "badge-ok",
  full: "badge-ok",
  partial: "badge-info",
  weak: "badge-warn",
  exact: "badge-bad",
  likely: "badge-warn",
};

const GERMAN_STATUS_LABELS: Record<string, string> = {
  all: "alle",
  draft: "Entwurf",
  scheduled: "geplant",
  published: "veröffentlicht",
  archived: "archiviert",
  pending: "ausstehend",
  approved: "bestätigt",
  performing: "auf der Bühne",
  completed: "fertig",
  rejected: "abgelehnt",
  cancelled: "storniert",
  failed: "fehlgeschlagen",
  paid: "bezahlt",
  active: "aktiv",
  expired: "abgelaufen",
  revoked: "widerrufen",
  refund_pending: "Erstattung ausstehend",
  refunded: "erstattet",
  waiting_payment: "wartet auf Zahlung",
  waiting_list: "Warteliste",
  waiting_refund: "wartet auf Rückzahlung",
  viewed: "gesehen",
  new: "neu",
  in_progress: "in Bearbeitung",
  resolved: "erledigt",
  full: "voll",
  partial: "teilweise",
  weak: "schwach",
  exact: "exakt",
  likely: "wahrscheinlich",
};

/** Human label for a status value; English keeps the raw value with spaces. */
export function statusLabel(status: string, locale: "en" | "de"): string {
  if (locale === "de") return GERMAN_STATUS_LABELS[status] ?? status.replaceAll("_", " ");
  return status.replaceAll("_", " ");
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const locale = useCurrentLocale();
  return (
    <span className={`badge ${BADGE_TONES[status] ?? "badge-neutral"}`}>
      {label ?? (locale === "de" ? statusLabel(status, locale) : status)}
    </span>
  );
}

export function Loading({ label }: { label?: string }) {
  const locale = useCurrentLocale();
  const displayLabel = label ?? (locale === "de" ? "Wird geladen…" : "Loading…");
  return (
    <div className="state-box" role="status" aria-live="polite">
      {displayLabel}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const de = useCurrentLocale() === "de";
  const message = error instanceof Error ? error.message : (de ? "Etwas ist schiefgelaufen." : "Something went wrong.");
  return (
    <div className="state-box state-error" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>
          {de ? "Erneut versuchen" : "Try again"}
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
  confirmLabel,
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const de = useCurrentLocale() === "de";

  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement | null;
      confirmRef.current?.focus();
    }
    return () => {
      if (open) previousFocus.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
      if (event.key === "Tab") {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])") ?? [],
        ).filter((element) => !element.hasAttribute("disabled"));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId}>{title}</h2>
        {body ? <p>{body}</p> : null}
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {de ? "Abbrechen" : "Cancel"}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel ?? (de ? "Bestätigen" : "Confirm")}
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
  const controlId = useId();
  const errorId = useId();
  type ControlProps = {
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean | "true" | "false";
  };
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<ControlProps>, {
        id: (children as ReactElement<ControlProps>).props.id ?? controlId,
        "aria-describedby": error
          ? [(children as ReactElement<ControlProps>).props["aria-describedby"], errorId].filter(Boolean).join(" ")
          : (children as ReactElement<ControlProps>).props["aria-describedby"],
        "aria-invalid": error ? "true" : (children as ReactElement<ControlProps>).props["aria-invalid"],
      })
    : children;
  return (
    <div className="field">
      <label htmlFor={isValidElement(children) ? ((children as ReactElement<ControlProps>).props.id ?? controlId) : undefined}>{label}</label>
      {control}
      {error ? <p id={errorId} className="field-error">{error}</p> : null}
    </div>
  );
}
