import { NavLink } from "react-router-dom";

import { useLocale } from "../i18n/LocaleContext";
import { ContentPage } from "./ContentPage";

export function OffersPage() {
  const { site } = useLocale();
  const offers = site?.offers;
  return (
    <div className="offers-page">
      <ContentPage slug="offers" />
      {offers ? (
        <>
          <div className="offers-grid">
            {offers.pages.map((page) => (
              <NavLink key={page.to} to={page.to} className="offers-card">
                {page.title}
              </NavLink>
            ))}
          </div>
          <ul className="offers-forms">
            {offers.forms.map((form) => (
              <li key={form.to}>
                <NavLink to={form.to}>{form.title}</NavLink>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
