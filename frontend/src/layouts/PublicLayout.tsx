import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

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

function NavItem({
  item,
  isOpen,
  onToggle,
  onClose,
}: {
  item: SiteNavItem;
  isOpen: boolean;
  onToggle: (label: string) => void;
  onClose: () => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (item.children?.length) {
    return (
      <div className={`site-nav-group${isOpen ? " is-open" : ""}`}>
        <button
          ref={triggerRef}
          type="button"
          className="site-nav-group-label"
          aria-haspopup="true"
          aria-expanded={isOpen}
          onClick={() => onToggle(item.label)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && isOpen) {
              onClose();
              triggerRef.current?.focus();
            }
          }}
        >
          {item.label}
        </button>
        <div className="site-nav-group-menu">
          {item.children.map((child) => (
            <NavLink key={child.to} to={child.to ?? "#"} onClick={onClose}>
              {child.label}
            </NavLink>
          ))}
        </div>
      </div>
    );
  }
  return (
    <NavLink to={item.to ?? "#"} end={item.to === "/"} onClick={onClose}>
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
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", appearance);
    localStorage.setItem(APPEARANCE_KEY, appearance);
  }, [appearance]);

  // Close any open dropdown whenever the route changes.
  useEffect(() => {
    setOpenGroup(null);
  }, [location.pathname]);

  // Close the open dropdown on Escape or on a click outside the nav.
  useEffect(() => {
    if (!openGroup) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenGroup(null);
      }
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenGroup(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openGroup]);

  const closeGroup = () => setOpenGroup(null);
  const toggleGroup = (label: string) =>
    setOpenGroup((prev) => (prev === label ? null : label));

  const nav = site?.nav ?? [];
  const footer = site?.footer;

  return (
    <div className="shell">
      {data.isDemo ? (
        <div className="demo-banner" role="note">
          <strong>Demo mode</strong> — synthetic data, no real backend. Actions are simulated.
        </div>
      ) : null}
      <nav className="site-nav" aria-label="Main navigation" ref={navRef}>
        <div className="site-nav-inner">
          <NavLink to="/" className="site-nav-brand" onClick={closeGroup}>
            IN<em>CAS</em>
          </NavLink>
          <div className="site-nav-links">
            {nav.map((item) => (
              <NavItem
                key={item.label}
                item={item}
                isOpen={openGroup === item.label}
                onToggle={toggleGroup}
                onClose={closeGroup}
              />
            ))}
            {session.capabilities.length > 0 || data.isDemo ? (
              <NavLink to="/admin" onClick={closeGroup}>
                {t("nav.admin")}
              </NavLink>
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
