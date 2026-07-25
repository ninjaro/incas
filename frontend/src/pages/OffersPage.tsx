import { Link, NavLink } from "react-router-dom";

import { EventIcon } from "../components/events";
import { Loading, PageHeader } from "../components/ui";
import { getEventKind } from "../domain/eventKinds";
import { useLocale } from "../i18n/LocaleContext";

export function OffersPage() {
  const { site, loading, locale } = useLocale();
  if (loading) return <Loading />;
  const offers = site?.offers;
  if (!offers) return null;
  const de = locale === "de";
  const weekdayNames = de
    ? ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]
    : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return (
    <div className="offers-page">
      <PageHeader kicker={de ? "INCAS Programm" : "INCAS programme"} title={offers.title} sub={offers.subtitle} />
      <div className="offers-grid">
        {offers.pages.map((page) => {
          const kind = page.eventKind ? getEventKind(page.eventKind) : undefined;
          const schedule = kind?.schedule;
          return (
            <article key={page.to} className={`offers-card${page.featured ? " is-featured" : ""}`}>
              <Link className="offers-card-main card-primary-link" to={page.to} aria-label={page.title}>
                <EventIcon icon={page.icon} />
                <div className="offers-card-copy">
                  <h2>{page.title}</h2>
                  <p>{page.description}</p>
                  {schedule ? (
                    <p className="offers-card-meta">
                      {de ? "Typischer Start" : "Typical start"}: {weekdayNames[schedule.weekday]} · {schedule.time}
                    </p>
                  ) : null}
                </div>
              </Link>
              {page.secondaryAction ? <div className="offers-card-footer">
                {page.secondaryAction ? <Link className="btn btn-outline btn-sm" to={page.secondaryAction.to}>{page.secondaryAction.title}</Link> : null}
              </div> : null}
            </article>
          );
        })}
      </div>
      <section className="offers-actions" aria-labelledby="offer-actions-title">
        <h2 id="offer-actions-title">{de ? "Formulare" : "Applications and contact"}</h2>
        <div className="form-actions">{offers.forms.map((form) => <NavLink key={form.to} to={form.to} className="btn btn-outline">{form.title}</NavLink>)}</div>
      </section>
    </div>
  );
}
