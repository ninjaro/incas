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
              <EventIcon icon={page.icon} />
              <div className="offers-card-copy">
                <h2><Link to={page.to}>{page.title}</Link></h2>
                <p>{page.description}</p>
                {schedule ? (
                  <p className="offers-card-meta">
                    {de ? "Typischer Start" : "Typical start"}: {weekdayNames[schedule.weekday]} · {schedule.time}
                  </p>
                ) : null}
              </div>
              <div className="offers-card-footer">
                <Link className="offers-card-more" to={page.to}>{de ? "Mehr erfahren" : "Learn more"} <span aria-hidden="true">-&gt;</span></Link>
                {page.secondaryAction ? <Link className="btn btn-outline btn-sm" to={page.secondaryAction.to}>{page.secondaryAction.title}</Link> : null}
              </div>
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
