import { NavLink } from "react-router-dom";

import { Loading } from "../components/ui";
import { useLocale } from "../i18n/LocaleContext";

/**
 * Interim /contact page. The real contact form is not migrated yet (tracked
 * in a later slice); this states that plainly and points to the contact
 * channels the site already exposes instead of dead-ending or reusing an
 * unrelated content page.
 */
export function ContactPage() {
  const { site, loading } = useLocale();
  if (loading) return <Loading />;

  const forms = (site?.offers.forms ?? []).filter((form) => form.to !== "/contact");
  const socials = (site?.footer.social ?? []).filter((entry) => entry.url);

  return (
    <div className="state-box contact-page">
      <h1>Contact</h1>
      <p>The contact form is being migrated to the new site and isn&apos;t ready yet.</p>
      <p>In the meantime, you can reach us through:</p>
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
