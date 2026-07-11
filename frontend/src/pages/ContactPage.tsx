import { NavLink } from "react-router-dom";

import { Loading } from "../components/ui";
import { useLocale, useT } from "../i18n/LocaleContext";

/**
 * Interim /contact page. The real contact form is not migrated yet (tracked
 * in a later slice); this states that plainly and points to the contact
 * channels the site already exposes instead of dead-ending or reusing an
 * unrelated content page.
 */
export function ContactPage() {
  const { site, loading } = useLocale();
  const t = useT();
  if (loading) return <Loading />;

  const forms = (site?.offers.forms ?? []).filter((form) => form.to !== "/contact");
  const socials = (site?.footer.social ?? []).filter((entry) => entry.url);

  return (
    <div className="state-box contact-page">
      <h1>{t("contact.title")}</h1>
      <p>{t("contact.intro")}</p>
      <p>{t("contact.channels_intro")}</p>
      {forms.length ? (
        <ul>
          {forms.map((form) => (
            <li key={form.to}>
              <NavLink to={form.to}>{form.title}</NavLink>
            </li>
          ))}
        </ul>
      ) : null}
      {socials.length ? (
        <ul>
          {socials.map((entry) => (
            <li key={entry.platform}>
              <a href={entry.url ?? undefined} target="_blank" rel="noreferrer">
                {entry.platform}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
