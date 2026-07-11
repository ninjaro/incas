import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import type { Locale, SiteNavItem } from "../api/types";
import { useSession } from "../auth/SessionContext";
import { useData } from "../data/DataProviderContext";
import { useLocale, useT } from "../i18n/LocaleContext";
import { assetUrl } from "../utils/assets";

const APPEARANCE_KEY = "incas.appearance";

function initialAppearance(): "light" | "dark" {
  const stored = globalThis.localStorage?.getItem?.(APPEARANCE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function AppearanceIcon({ appearance }: { appearance: "light" | "dark" }) {
  return appearance === "dark" ? (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z"/></svg>
  );
}

function SocialIcon({ platform }: { platform: string }) {
  if (platform === "instagram") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></svg>;
  }
  if (platform === "facebook") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 21v-8h3l.5-4H14V7c0-1.2.4-2 2.2-2H18V1.5c-.8-.1-1.7-.2-2.6-.2C11.7 1.3 10 3.5 10 6.8V9H7v4h3v8h4Z"/></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>;
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
          data-nav-group={item.label}
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", appearance);
    globalThis.localStorage?.setItem?.(APPEARANCE_KEY, appearance);
  }, [appearance]);

  // Close any open dropdown whenever the route changes.
  useEffect(() => {
    setOpenGroup(null);
    setMobileOpen(false);
  }, [location.pathname]);

  // Close the open dropdown on Escape or on a click outside the nav.
  useEffect(() => {
    if (!openGroup && !mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const trigger = Array.from(
          navRef.current?.querySelectorAll<HTMLButtonElement>("[data-nav-group]") ?? [],
        ).find((element) => element.dataset.navGroup === openGroup);
        setOpenGroup(null);
        setMobileOpen(false);
        trigger?.focus();
      }
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenGroup(null);
        setMobileOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openGroup, mobileOpen]);

  const closeGroup = () => {
    setOpenGroup(null);
    setMobileOpen(false);
  };
  const toggleGroup = (label: string) =>
    setOpenGroup((prev) => (prev === label ? null : label));

  const nav = site?.nav ?? [];
  const footer = site?.footer;

  return (
    <div className="shell">
      {data.isDemo ? (
        <div className="demo-banner" role="note">
          <strong>{t("demo.banner_label")}</strong> — {t("demo.banner_body")}
        </div>
      ) : null}
      <nav className="site-nav" aria-label={t("aria.main_nav")} ref={navRef}>
        <div className="site-nav-inner">
          <NavLink to="/" className="site-nav-brand" onClick={closeGroup}>
            <img src={assetUrl("img/incas-logo.png") ?? ""} alt="INCAS" />
          </NavLink>
          <button
            type="button"
            className="site-nav-menu-toggle"
            aria-expanded={mobileOpen}
            aria-controls="site-nav-menu"
            aria-label={mobileOpen ? (locale === "de" ? "Menü schließen" : "Close menu") : (locale === "de" ? "Menü öffnen" : "Open menu")}
            onClick={() => setMobileOpen((value) => !value)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
          <div id="site-nav-menu" className={`site-nav-menu${mobileOpen ? " is-open" : ""}`}>
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
            {session.hasAccessKeys ? (
                <NavLink to="/admin" onClick={closeGroup}>
                  {t("nav.admin")}
                </NavLink>
              ) : null}
            </div>
            <div className="site-nav-controls">
              <div className="locale-switch" role="group" aria-label={t("aria.language")}>
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
                aria-label={t("aria.appearance")}
                onClick={() => setAppearance((prev) => (prev === "dark" ? "light" : "dark"))}
              >
                <AppearanceIcon appearance={appearance} />
              </button>
            </div>
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
            <div className="site-footer-socials" aria-label={t("aria.social")}>
              {footer.social
                .filter((s) => s.url)
                .map((s) => (
                  <a key={s.platform} href={s.url ?? "#"} target="_blank" rel="noreferrer">
                    <SocialIcon platform={s.platform} />
                    <span className="sr-only">{s.platform}</span>
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
