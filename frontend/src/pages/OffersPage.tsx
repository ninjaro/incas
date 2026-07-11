import { NavLink } from "react-router-dom";

import { EventIcon } from "../components/events";
import { Loading, PageHeader } from "../components/ui";
import { useLocale } from "../i18n/LocaleContext";

export function OffersPage() {
  const { site, loading, locale } = useLocale();
  if (loading) return <Loading />;
  const offers = site?.offers;
  if (!offers) return null;
  const de = locale === "de";
  return (
    <div className="offers-page">
      <PageHeader kicker={de ? "INCAS Programm" : "INCAS programme"} title={offers.title} sub={offers.subtitle} />
      <div className="offers-grid">
        {offers.pages.map((page) => (
          <NavLink key={page.to} to={page.to} className="offers-card">
            <EventIcon icon={page.icon} />
            <div><h2>{page.title}</h2><p>{page.description}</p><span>{de ? "Mehr erfahren" : "Learn more"} <span aria-hidden="true">-&gt;</span></span></div>
          </NavLink>
        ))}
      </div>
      <section className="offers-actions" aria-labelledby="offer-actions-title">
        <h2 id="offer-actions-title">{de ? "Formulare" : "Applications and contact"}</h2>
        <div className="form-actions">{offers.forms.map((form) => <NavLink key={form.to} to={form.to} className="btn btn-outline">{form.title}</NavLink>)}</div>
      </section>
    </div>
  );
}
