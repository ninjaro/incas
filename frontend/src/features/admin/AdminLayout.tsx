import { useEffect, useRef, useState, type FormEvent } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import type { Capability, Locale } from "../../api/types";
import { ColorSchemeToggle } from "../../appearance/ColorScheme";
import { useSession } from "../../auth/SessionContext";
import { useData } from "../../data/DataProviderContext";
import { useCurrentLocale } from "../../i18n/LocaleContext";
import { capabilityLabel } from "./labels";

type AdminNavItem = {
  to: string;
  label: Record<Locale, string>;
  capability: Capability | null;
};

const ADMIN_NAV: AdminNavItem[] = [
  { to: "/admin", label: { en: "Dashboard", de: "Übersicht" }, capability: null },
  { to: "/admin/posts", label: { en: "Posts & Events", de: "Beiträge & Events" }, capability: "posts" },
  { to: "/admin/social", label: { en: "Social Publications", de: "Social-Media-Beiträge" }, capability: "posts" },
  { to: "/admin/registrations", label: { en: "Event Registrations", de: "Eventanmeldungen" }, capability: "event_registrations_view" },
  { to: "/admin/payments", label: { en: "Payments", de: "Zahlungen" }, capability: "event_registrations" },
  { to: "/admin/forms", label: { en: "Forms Inbox", de: "Formular-Eingang" }, capability: "forms_triage" },
  { to: "/admin/access-keys", label: { en: "Access Keys", de: "Zugangsschlüssel" }, capability: "access_keys" },
  { to: "/admin/themes", label: { en: "Themes", de: "Themes" }, capability: "theme_review" },
  { to: "/admin/karaoke", label: { en: "Karaoke Queue", de: "Karaoke-Warteschlange" }, capability: "karaoke_queue" },
  { to: "/admin/tandem", label: { en: "Language Tandem", de: "Sprachtandem" }, capability: "language_tandem_blind" },
];

function unlockedMessage(scopes: string[] | undefined, locale: Locale, labels: Record<string, string>) {
  const names = (scopes ?? []).map((scope) => capabilityLabel(scope, locale, labels)).join(", ");
  return locale === "de"
    ? `Freigeschaltet: ${names || "bereits aktiv"}`
    : `Unlocked: ${names || "already active"}`;
}

function UnlockForm() {
  const session = useSession();
  const data = useData();
  const locale = useCurrentLocale();
  const de = locale === "de";
  const [key, setKey] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    try {
      const result = await session.unlock(key);
      setKey("");
      setMessage({ tone: "ok", text: unlockedMessage(result.newScopes, locale, result.capabilityLabels) });
    } catch {
      setMessage({ tone: "bad", text: de ? "Dieser Zugangsschlüssel ist ungültig." : "This access key is not valid." });
    }
  };

  return (
    <form onSubmit={submit} className="card" style={{ padding: 14, marginTop: 16 }}>
      <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>
        {de ? "Weiteren Schlüssel aktivieren" : "Activate another key"}
        <input
          type="password"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          placeholder={de ? "Zugangsschlüssel" : "Access key"}
          style={{ width: "100%", marginTop: 4, padding: "6px 10px" }}
        />
      </label>
      {data.isDemo ? (
        <p style={{ fontSize: "0.75rem", color: "var(--ink-soft)", margin: "6px 0 0" }}>
          {de ? "Demo-Schlüssel" : "Demo keys"}: demo-admin, demo-review, demo-karaoke, demo-tandem-blind, demo-checkin, demo-forms-triage
        </p>
      ) : null}
      {message ? <p className={`notice notice-${message.tone}`}>{message.text}</p> : null}
      <button type="submit" className="btn btn-outline btn-sm" style={{ marginTop: 8 }}>
        {de ? "Freischalten" : "Unlock"}
      </button>
    </form>
  );
}

export function AdminLayout() {
  const session = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const locale = useCurrentLocale();
  const de = locale === "de";
  const handledActivation = useRef("");
  const [activationMessage, setActivationMessage] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);

  useEffect(() => {
    const queryKey = new URLSearchParams(location.search).get("accessKey") ?? "";
    const fragmentKey = window.location.hash.startsWith("#access-key=")
      ? decodeURIComponent(window.location.hash.slice("#access-key=".length))
      : "";
    const key = queryKey || fragmentKey;
    if (!key || handledActivation.current === key) return;

    handledActivation.current = key;
    void session.unlock(key)
      .then((result) => {
        setActivationMessage(unlockedMessage(result.newScopes, locale, result.capabilityLabels));
      })
      .catch(() => {
        setActivationMessage(locale === "de"
          ? "Dieser Zugangsschlüssel ist ungültig, abgelaufen oder vorübergehend gesperrt."
          : "This access key is invalid, expired, or rate limited.");
      })
      .finally(() => {
        navigate("/admin", { replace: true });
      });
  }, [locale, location.search, navigate, session]);

  const lock = async () => {
    setLocking(true);
    setActivationMessage(null);
    try {
      await session.lock();
      navigate("/", { replace: true });
    } catch (error) {
      setActivationMessage(error instanceof Error
        ? error.message
        : de ? "Der Admin-Zugang konnte nicht beendet werden." : "Admin access could not be cleared.");
    } finally {
      setLocking(false);
    }
  };

  return (
    <div className="admin-shell">
      <aside>
        <div className="admin-sidebar-inner">
          {session.capabilities.length > 0 ? (
            <button type="button" className="btn btn-outline btn-sm admin-lock" disabled={locking} onClick={() => void lock()}>
              {locking ? (de ? "Wird gesperrt…" : "Locking…") : (de ? "Admin sperren" : "Lock admin")}
            </button>
          ) : null}
          <ColorSchemeToggle className="admin-color-scheme" />
          <nav className="admin-sidenav" aria-label={de ? "Admin-Navigation" : "Admin navigation"}>
            {ADMIN_NAV.map((item) => {
              const locked = item.capability !== null && !session.hasCapability(item.capability);
              return locked ? (
                <span
                  key={item.to}
                  className="admin-nav-disabled"
                  aria-disabled="true"
                  title={de ? "Benötigt einen weiteren Zugangsschlüssel" : "Requires an additional access key"}
                >
                  {item.label[locale]}<small>{de ? "gesperrt" : "locked"}</small>
                </span>
              ) : (
                <NavLink key={item.to} to={item.to} end={item.to === "/admin"}>
                  {item.label[locale]}
                </NavLink>
              );
            })}
          </nav>
          <UnlockForm />
          {session.capabilities.length > 0 ? (
            <div className="capability-chips" aria-label={de ? "Aktive Berechtigungen" : "Active capabilities"}>
              {session.capabilities.map((capability) => (
                <span key={capability} className="badge badge-brand">
                  {capabilityLabel(capability, locale, session.capabilityLabels)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </aside>
      <div className="admin-content">
        {activationMessage ? (
          <p className="notice notice-info" role="status">{activationMessage}</p>
        ) : null}
        <Outlet />
      </div>
    </div>
  );
}
