import { Link } from "react-router-dom";

import type { Capability, Locale } from "../../api/types";
import { useSession } from "../../auth/SessionContext";
import { PageHeader } from "../../components/ui";
import { useCurrentLocale } from "../../i18n/LocaleContext";
import { usePublicTheme } from "../themes/usePublicTheme";

type DashboardEntry = {
  to: string;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  capability: Capability;
};

const ENTRIES: DashboardEntry[] = [
  {
    to: "/admin/registrations",
    title: { en: "Event Registrations", de: "Eventanmeldungen" },
    description: { en: "Capacity, payment states, waiting lists, and promotions.", de: "Kapazität, Zahlungsstatus, Wartelisten und Nachrücker." },
    capability: "event_registrations",
  },
  {
    to: "/admin/payments",
    title: { en: "Payments", de: "Zahlungen" },
    description: { en: "Review registration payments and refund states.", de: "Zahlungen zu Anmeldungen und Erstattungen prüfen." },
    capability: "event_registrations",
  },
  {
    to: "/admin/forms",
    title: { en: "Forms Inbox", de: "Formular-Eingang" },
    description: { en: "Review contact requests and event suggestions.", de: "Kontaktanfragen und Eventvorschläge prüfen." },
    capability: "forms",
  },
  {
    to: "/admin/access-keys",
    title: { en: "Access Keys", de: "Zugangsschlüssel" },
    description: { en: "Create scoped temporary keys and revoke them safely.", de: "Befristete Schlüssel mit begrenzten Rechten erstellen und sicher widerrufen." },
    capability: "access_keys",
  },
  {
    to: "/admin/posts",
    title: { en: "Posts & Events", de: "Beiträge & Events" },
    description: { en: "Drafts, templates, scheduling, and social publishing.", de: "Entwürfe, Vorlagen, Planung und Social-Media-Veröffentlichung." },
    capability: "posts",
  },
  {
    to: "/admin/social",
    title: { en: "Social Publications", de: "Social-Media-Beiträge" },
    description: { en: "Review scheduled, published, simulated, and failed posts.", de: "Geplante, veröffentlichte, simulierte und fehlgeschlagene Beiträge prüfen." },
    capability: "posts",
  },
  {
    to: "/admin/themes",
    title: { en: "Page Themes", de: "Seiten-Themes" },
    description: { en: "Preview, vote, and manage the public look of each page.", de: "Das öffentliche Aussehen jeder Seite ansehen, abstimmen und verwalten." },
    capability: "theme_review",
  },
  {
    to: "/admin/karaoke",
    title: { en: "Karaoke Queue", de: "Karaoke-Warteschlange" },
    description: { en: "Moderate song requests and run the live queue.", de: "Songwünsche moderieren und die Live-Warteschlange steuern." },
    capability: "karaoke_queue",
  },
  {
    to: "/admin/tandem",
    title: { en: "Language Tandem", de: "Sprachtandem" },
    description: { en: "Match tandem partners; stronger keys reveal contact details.", de: "Tandempartner zuordnen; stärkere Schlüssel zeigen Kontaktdaten." },
    capability: "language_tandem_blind",
  },
];

export function DashboardPage() {
  const session = useSession();
  const { theme } = usePublicTheme("admin_dashboard");
  const locale = useCurrentLocale();
  const de = locale === "de";

  const unlocked = ENTRIES.filter((entry) => session.hasCapability(entry.capability));
  const locked = ENTRIES.filter((entry) => !session.hasCapability(entry.capability));

  return (
    <>
      <PageHeader
        kicker="Admin"
        title={de ? "Übersicht" : "Dashboard"}
        sub={
          session.capabilities.length === 0
            ? (de
              ? "Aktiviere in der Seitenleiste einen Zugangsschlüssel, um Admin-Bereiche freizuschalten."
              : "Activate an access key in the sidebar to unlock admin panels.")
            : (de
              ? "Bereiche, die deine aktuellen Schlüssel freischalten. Stärkere Schlüssel zeigen mehr Funktionen in denselben Bereichen."
              : "Panels unlocked by your current keys. Stronger keys reveal more controls inside the same panels.")
        }
      />
      {theme === "compact" ? (
        <div className="card">
          {unlocked.map((entry) => (
            <p key={entry.to} style={{ margin: "6px 0" }}>
              <Link to={entry.to}>
                <strong>{entry.title[locale]}</strong>
              </Link>{" "}
              · {entry.description[locale]}
            </p>
          ))}
          {unlocked.length === 0 ? <p>{de ? "Noch keine Bereiche freigeschaltet." : "No panels unlocked yet."}</p> : null}
        </div>
      ) : (
        <div className="theme-page-grid">
          {unlocked.map((entry) => (
            <Link key={entry.to} to={entry.to} className="card" style={{ textDecoration: "none" }}>
              <h3 style={{ marginBottom: 4 }}>{entry.title[locale]}</h3>
              <p style={{ margin: 0, color: "var(--ink-soft)" }}>{entry.description[locale]}</p>
            </Link>
          ))}
        </div>
      )}
      {locked.length > 0 ? (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: "1rem", color: "var(--ink-faint)" }}>{de ? "Gesperrte Bereiche" : "Locked capabilities"}</h2>
          <div className="capability-chips">
            {locked.map((entry) => (
              <span key={entry.to} className="badge badge-neutral" title={entry.description[locale]}>
                🔒 {entry.title[locale]}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
