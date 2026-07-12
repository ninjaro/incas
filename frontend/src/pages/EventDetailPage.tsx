import { Link, useParams } from "react-router-dom";

import {
  ArchivedBadge,
  EventAvailability,
  EventDate,
  EventIcon,
  EventMap,
  EventMarker,
  EventPaymentNotice,
  EventTitle,
  PinnedBadge,
} from "../components/events";
import { ErrorState, Loading } from "../components/ui";
import { useData } from "../data/DataProviderContext";
import { KaraokeEventFeature } from "../features/karaoke/KaraokePublicPage";
import { EventRegistrationForm } from "../features/registration/EventRegistrationForm";
import { useAsync } from "../hooks/useAsync";
import { useLocale } from "../i18n/LocaleContext";
import { getEventKind } from "../domain/eventKinds";
import { assetUrl } from "../utils/assets";

export function EventDescription({ bodyHtml, summary }: { bodyHtml: string; summary: string }) {
  if (bodyHtml) {
    return <div className="card site-content" dangerouslySetInnerHTML={{ __html: bodyHtml }} />;
  }
  return <div className="card site-content"><p>{summary}</p></div>;
}

export function EventDetailPage() {
  const { slug = "" } = useParams();
  const data = useData();
  const { locale } = useLocale();
  const de = locale === "de";
  const post = useAsync(() => data.getPublicPost(slug), [data, slug]);

  if (post.loading) return <Loading />;
  if (post.error || !post.data) return <ErrorState error={post.error} onRetry={post.reload} />;
  const event = post.data;
  const eventImage = assetUrl(event.imageUrl);
  const eventKindLabel = event.eventKind
    ? getEventKind(event.eventKind)?.label[de ? "de" : "en"] ?? event.eventKind.replaceAll("_", " ")
    : null;

  return (
    <article className="event-detail">
      <Link to="/calendar" className="back-link">{de ? "Zurück zum Kalender" : "Back to calendar"}</Link>
      <header className="event-detail-hero">
        <div className="event-detail-heading">
          <div className="event-detail-type"><EventIcon eventKind={event.eventKind} /><EventMarker eventKind={event.eventKind} />{eventKindLabel ? <span>{eventKindLabel}</span> : null}</div>
          <EventTitle title={event.title} as="h1" />
          <p>{event.summary}</p>
          <div className="event-card-flags">{event.isPinned ? <PinnedBadge locale={locale} /> : null}{event.publicationState === "archived" ? <ArchivedBadge locale={locale} /> : null}{event.registration ? <EventAvailability registration={event.registration} locale={locale} /> : null}</div>
        </div>
        {eventImage ? <img src={eventImage} alt="" /> : null}
      </header>

      <div className="event-detail-grid">
        <section className="event-detail-main">
          <EventDescription bodyHtml={event.bodyHtml ?? ""} summary={event.summary} />
          {event.map ? <EventMap config={event.map} /> : null}
          {event.eventKind === "karaoke" ? <KaraokeEventFeature eventSlug={event.slug} eventTitle={event.title.full} /> : null}
          {event.registration ? <EventRegistrationForm event={event} /> : null}
        </section>
        <aside className="event-detail-aside">
          <div className="card event-facts">
            <h2>{de ? "Eventdetails" : "Event details"}</h2>
            <dl className="detail-list">
              {event.startsAt ? <div><dt>{de ? "Datum und Zeit" : "Date and time"}</dt><dd><EventDate start={event.startsAt} end={event.endsAt} locale={locale} /></dd></div> : null}
              {event.venue ? <div><dt>{de ? "Ort" : "Venue"}</dt><dd>{event.venue}</dd></div> : null}
              {event.address ? <div><dt>{de ? "Adresse" : "Address"}</dt><dd>{event.address}{event.city ? `, ${event.city}` : ""}</dd></div> : null}
              {event.meetingPoint ? <div><dt>{de ? "Treffpunkt" : "Meeting point"}</dt><dd>{event.meetingPoint}</dd></div> : null}
              {event.destination ? <div><dt>{de ? "Ziel" : "Destination"}</dt><dd>{event.destination}</dd></div> : null}
              {event.eventPublicId ? <div><dt>Event ID</dt><dd>{event.eventPublicId}</dd></div> : null}
            </dl>
            {event.registration ? <><EventPaymentNotice registration={event.registration} locale={locale} /><p>{event.registration.nonCancelledCount} {de ? "aktive Anmeldungen" : "non-cancelled applications"}</p></> : null}
          </div>
          {event.socialLinks.length ? <div className="card"><h2>{de ? "Geteilt auf" : "Also published on"}</h2>{event.socialLinks.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.provider}</a>)}</div> : null}
        </aside>
      </div>
    </article>
  );
}
