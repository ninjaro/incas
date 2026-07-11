import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import type { Locale, SiteNavItem } from "../api/types";
import { useSession } from "../auth/SessionContext";
import { useData } from "../data/DataProviderContext";
import { useLocale, useT } from "../i18n/LocaleContext";

const APPEARANCE_KEY = "incas.appearance";

function initialAppearance(): "light" | "dark" {
  const stored = localStorage.getItem(APPEARANCE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function NavItem({ item }: { item: SiteNavItem }) {
  const [open, setOpen] = useState(false);

  if (item.children?.length) {
    return (
      <div className={`site-nav-group${open ? " is-open" : ""}`}>
        <button
          type="button"
          className="site-nav-group-label"
          aria-haspopup="true"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          {item.label}
        </button>
        <div className="site-nav-group-menu">
          {item.children.map((child) => (
            <NavLink key={child.to} to={child.to ?? "#"}>
              {child.label}
            </NavLink>
          ))}
        </div>
      </div>
    );
  }
  return (
    <NavLink to={item.to ?? "#"} end={item.to === "/"}>
      {item.label}
    </NavLink>
  );
}

export function PublicLayout() {
  const data = useData();
  const session = useSession();
  const { locale, setLocale, site } = useLocale();
  const t = useT();
  const [appearance, setAppearance] = useState<"light" | "dark">(initialAppearance);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", appearance);
    localStorage.setItem(APPEARANCE_KEY, appearance);
  }, [appearance]);

  const nav = site?.nav ?? [];
  const footer = site?.footer;

  return (
    <div className="shell">
      {data.isDemo ? (
        <div className="demo-banner" role="note">
          <strong>Demo mode</strong> — synthetic data, no real backend. Actions are simulated.
        </div>
      ) : null}
      <nav className="site-nav" aria-label="Main navigation">
        <div className="site-nav-inner">
          <NavLink to="/" className="site-nav-brand">
            IN<em>CAS</em>
          </NavLink>
          <div className="site-nav-links">
            {nav.map((item) => (
              <NavItem key={item.label} item={item} />
            ))}
            {session.capabilities.length > 0 || data.isDemo ? (
              <NavLink to="/admin">{t("nav.admin")}</NavLink>
            ) : null}
          </div>
          <div className="site-nav-controls">
            <div className="locale-switch" role="group" aria-label="Language">
              {(["en", "de"] as Locale[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  className={locale === code ? "is-active" : ""}
                  aria-pressed={locale === code}
                  onClick={() => setLocale(code)}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="appearance-toggle"
              aria-label="Toggle light or dark appearance"
              onClick={() => setAppearance((prev) => (prev === "dark" ? "light" : "dark"))}
            >
              {appearance === "dark" ? "☀︎" : "☾"}
            </button>
          </div>
        </div>
      </nav>
      <main className="shell-main">
        <Outlet />
      </main>
      {footer ? (
        <footer className="site-footer">
          <div className="site-footer-inner">
            <p className="site-footer-copy">{footer.copy}</p>
            <div className="site-footer-socials" aria-label="Social media">
              {footer.social
                .filter((s) => s.url)
                .map((s) => (
                  <a key={s.platform} href={s.url ?? "#"} target="_blank" rel="noreferrer">
                    {s.platform}
                  </a>
                ))}
            </div>
            <ul className="site-footer-links">
              {footer.offerLinks.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to}>{link.title}</NavLink>
                </li>
              ))}
            </ul>
          </div>
        </footer>
      ) : (
        <footer className="site-footer">INCAS</footer>
      )}
    </div>
  );
}
