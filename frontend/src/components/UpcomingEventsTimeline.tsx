import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";

export type EventTitleParts = {
  full: string;
  prefix: string;
  focus: string;
};

export type EventPayment = {
  capacity: number;
  isDeposit: boolean;
  kindLabel: string;
  priceDisplay: string;
};

export type TimelineEvent = {
  dateLabel: string;
  eventKind: string | null;
  isPinned: boolean;
  payment: EventPayment | null;
  startsAt: string;
  timeLabel: string;
  title: EventTitleParts;
  url: string;
};

export type UpcomingEventsTimelineProps = {
  ctaLabel: string;
  ctaUrl: string | null;
  emptyCtaLabel: string;
  emptyCtaUrl: string | null;
  emptyMessage: string;
  items: TimelineEvent[];
  kicker: string;
  modifier: string;
  title: string;
};

const iconByEventKind: Record<string, string> = {
  board_games: "bi-dice-5",
  breakfast: "bi-egg-fried",
  cafe_lingua: "bi-chat-dots",
  country_evening: "bi-globe-americas",
  dance: "bi-music-note-beamed",
  trip: "bi-signpost-2",
};

function EventIcon({ eventKind }: { eventKind: string | null }) {
  const iconClass = eventKind ? iconByEventKind[eventKind] : null;

  return <i className={`bi ${iconClass ?? "bi-calendar-event"}`} aria-hidden="true" />;
}

function EventTitle({ title }: { title: EventTitleParts }) {
  if (title.focus) {
    return (
      <span className="event-title-text">
        <span>{title.prefix}</span>
        <span className="event-title-focus">{title.focus}</span>
      </span>
    );
  }

  return (
    <span className="event-title-text">
      <span>{title.full}</span>
    </span>
  );
}

function PaymentNotice({ payment }: { payment: EventPayment | null }) {
  if (!payment?.priceDisplay) {
    return null;
  }

  const paymentCopy = payment.isDeposit
    ? `Refundable ${payment.kindLabel.toLowerCase()}`
    : payment.kindLabel;
  const placeLabel = payment.capacity === 1 ? "place" : "places";

  return (
    <div className="event-payment-notice fig-events-payment">
      <span className="badge text-bg-warning event-payment-required">Payment Required</span>
      <span className="event-payment-copy">
        {paymentCopy} <strong>€{payment.priceDisplay}</strong>
      </span>
      <span className="event-payment-capacity">
        {payment.capacity} {placeLabel}
      </span>
    </div>
  );
}

function HeaderAction({ ctaLabel, ctaUrl }: Pick<UpcomingEventsTimelineProps, "ctaLabel" | "ctaUrl">) {
  if (!ctaUrl) {
    return null;
  }

  return (
    <a href={ctaUrl} className="btn btn-sm btn-outline-primary fig-events-header-action">
      {ctaLabel} <i className="bi bi-arrow-right" aria-hidden="true" />
    </a>
  );
}

function EmptyState({
  ctaUrl,
  emptyCtaLabel,
  emptyCtaUrl,
  emptyMessage,
}: Pick<UpcomingEventsTimelineProps, "ctaUrl" | "emptyCtaLabel" | "emptyCtaUrl" | "emptyMessage">) {
  const actionUrl = emptyCtaUrl ?? ctaUrl;

  return (
    <div className="fig-events-empty">
      <p>{emptyMessage}</p>
      {actionUrl ? (
        <a href={actionUrl} className="btn btn-primary">
          {emptyCtaLabel} <i className="bi bi-arrow-right" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}

function EventItem({ children, item, index }: { children: ReactNode; item: TimelineEvent; index: number }) {
  const isFeatured = index === 0;
  const isAbove = index % 2 === 0;
  const itemClass = [
    "fig-events-item",
    isFeatured ? "is-featured" : "",
    isAbove ? "is-above" : "is-below",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <a href={item.url} className={itemClass} style={{ "--fig-event-index": index } as CSSProperties}>
      {children}
      <span className="fig-events-node" aria-hidden="true">
        <EventIcon eventKind={item.eventKind} />
      </span>
    </a>
  );
}

export function UpcomingEventsTimeline({
  ctaLabel,
  ctaUrl,
  emptyCtaLabel,
  emptyCtaUrl,
  emptyMessage,
  items,
  kicker,
  modifier,
  title,
}: UpcomingEventsTimelineProps) {
  const headingId = useId();
  const timelineItems = items.slice(0, 6);

  return (
    <section className={["fig-events", modifier].filter(Boolean).join(" ")} aria-labelledby={headingId}>
      <header className="fig-events-header">
        <div>
          <p className="fig-events-kicker">{kicker}</p>
          <h2 id={headingId}>{title}</h2>
        </div>
        <HeaderAction ctaLabel={ctaLabel} ctaUrl={ctaUrl} />
      </header>

      {timelineItems.length > 0 ? (
        <div className="fig-events-track" style={{ "--fig-event-count": timelineItems.length } as CSSProperties}>
          <div className="fig-events-line" aria-hidden="true" />
          {timelineItems.map((item, index) => (
            <EventItem item={item} index={index} key={`${item.startsAt}-${item.url}`}>
              <span className="fig-events-copy">
                {index === 0 ? <span className="fig-events-next">Next up</span> : null}
                <time className="fig-events-date" dateTime={item.startsAt}>
                  {item.dateLabel}
                </time>
                <strong className="fig-events-title">
                  <EventTitle title={item.title} />
                </strong>
                <span className="fig-events-meta">
                  <time dateTime={item.startsAt}>{item.timeLabel}</time>
                  <span>Details</span>
                </span>
                <PaymentNotice payment={item.payment} />
              </span>
            </EventItem>
          ))}
        </div>
      ) : (
        <EmptyState
          ctaUrl={ctaUrl}
          emptyCtaLabel={emptyCtaLabel}
          emptyCtaUrl={emptyCtaUrl}
          emptyMessage={emptyMessage}
        />
      )}
    </section>
  );
}
