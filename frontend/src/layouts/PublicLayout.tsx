import { useEffect, useId, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigationType } from "react-router-dom";

import type { Locale, SiteNavItem } from "../api/types";
import { useSession } from "../auth/SessionContext";
import { useData } from "../data/DataProviderContext";
import { localizedAboutItems } from "../domain/publicSections";
import { useLocale, useT } from "../i18n/LocaleContext";
import { assetUrl } from "../utils/assets";

const routeScrollPositions = new Map<string, number>();

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
  locale,
  onOpen,
  onToggle,
  onCloseGroup,
  onClose,
}: {
  item: SiteNavItem;
  isOpen: boolean;
  locale: Locale;
  onOpen: (label: string) => void;
  onToggle: (label: string) => void;
  onCloseGroup: () => void;
  onClose: () => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const hoverOpenedAtRef = useRef(0);
  const menuId = `site-nav-submenu-${useId().replaceAll(":", "")}`;
  const location = useLocation();
  const configuredChildren = item.section === "about"
    ? localizedAboutItems(locale).slice(1).map((child) => ({ label: child.title, to: child.path }))
    : item.children ?? [];
  const isSectionActive = Boolean(
    item.to && (location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)),
  );

  useEffect(() => () => {
    if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current);
  }, []);

  if (configuredChildren.length && item.to) {
    return (
      <div
        ref={groupRef}
        className={`site-nav-group${isOpen ? " is-open" : ""}${isSectionActive ? " is-section-active" : ""}`}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") {
            hoverTimerRef.current = window.setTimeout(() => {
              hoverOpenedAtRef.current = Date.now();
              onOpen(item.label);
            }, 120);
          }
        }}
        onPointerLeave={(event) => {
          if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = null;
          if (event.pointerType === "mouse" && !groupRef.current?.contains(document.activeElement)) {
            onCloseGroup();
          }
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onCloseGroup();
        }}
      >
        <div className="site-nav-group-primary">
          <NavLink className="site-nav-group-link" to={item.to} end onClick={onClose}>
            {item.label}
          </NavLink>
          <button
            ref={triggerRef}
            type="button"
            className="site-nav-group-disclosure"
            aria-haspopup="true"
            aria-expanded={isOpen}
            aria-controls={menuId}
            aria-label={isOpen
              ? `${locale === "de" ? "Untermenü schließen" : "Close submenu"}: ${item.label}`
              : `${locale === "de" ? "Untermenü öffnen" : "Open submenu"}: ${item.label}`}
            data-nav-group={item.label}
            onClick={() => {
              if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current);
              hoverTimerRef.current = null;
              // If the hover timer opened the menu a moment before this click,
              // the click's intent was "open": keep it open instead of toggling.
              if (isOpen && Date.now() - hoverOpenedAtRef.current < 400) {
                hoverOpenedAtRef.current = 0;
                onOpen(item.label);
                return;
              }
              onToggle(item.label);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                onOpen(item.label);
                window.requestAnimationFrame(() => {
                  document.querySelector<HTMLAnchorElement>(`#${menuId} a`)?.focus();
                });
              }
              if (event.key === "Escape" && isOpen) {
                event.stopPropagation();
                onCloseGroup();
                triggerRef.current?.focus();
              }
            }}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="m4 6 4 4 4-4" />
            </svg>
          </button>
        </div>
        <div id={menuId} className="site-nav-group-menu" hidden={!isOpen}>
          {configuredChildren.map((child) => (
            <NavLink key={child.to} to={child.to ?? "#"} end onClick={onClose}>
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
  const { locale, site } = useLocale();
  const t = useT();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const linkNavigationPendingRef = useRef(false);
  const location = useLocation();
  const navigationType = useNavigationType();
  const routePathKey = `path:${location.pathname}${location.search}`;

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    linkNavigationPendingRef.current = true;
    const savePosition = () => {
      routeScrollPositions.set(`entry:${location.key}`, window.scrollY);
      routeScrollPositions.set(routePathKey, window.scrollY);
    };
    const savePositionOnScroll = () => {
      if (!linkNavigationPendingRef.current) savePosition();
    };
    const saveBeforeLinkNavigation = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      savePosition();
      const href = anchor.getAttribute("href") ?? "";
      const isSamePageFragment = href.startsWith("#") && !href.startsWith("#/");
      if (anchor.target !== "_blank" && !isSamePageFragment) {
        linkNavigationPendingRef.current = true;
      }
    };

    window.addEventListener("scroll", savePositionOnScroll, { passive: true });
    document.addEventListener("click", saveBeforeLinkNavigation, true);
    return () => {
      window.removeEventListener("scroll", savePositionOnScroll);
      document.removeEventListener("click", saveBeforeLinkNavigation, true);
    };
  }, [location.key, routePathKey]);

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

  useEffect(() => {
    let frame = 0;
    let attempts = 0;
    const finishRestoration = () => {
      linkNavigationPendingRef.current = false;
    };
    const restorePosition = () => {
      if (attempts === 0) mainRef.current?.focus({ preventScroll: true });

      if (location.hash) {
        const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (target) {
          target.scrollIntoView();
          finishRestoration();
          return;
        }
      } else if (navigationType === "POP") {
        const savedPosition = routeScrollPositions.get(`entry:${location.key}`)
          ?? routeScrollPositions.get(routePathKey)
          ?? 0;
        window.scrollTo(0, savedPosition);
        if (Math.abs(window.scrollY - savedPosition) <= 1) {
          finishRestoration();
          return;
        }
      } else {
        window.scrollTo(0, 0);
        finishRestoration();
        return;
      }

      attempts += 1;
      if (attempts < 120) {
        frame = window.requestAnimationFrame(restorePosition);
      } else {
        finishRestoration();
      }
    };

    frame = window.requestAnimationFrame(restorePosition);
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [location.hash, location.key, navigationType, routePathKey]);

  const closeGroup = () => {
    setOpenGroup(null);
    setMobileOpen(false);
  };
  const toggleGroup = (label: string) =>
    setOpenGroup((prev) => (prev === label ? null : label));

  // Design-system navigation (INCAS Design System, Parchment Daylight):
  // Home, Events (Discover/Register), Calendar, Karaoke, Team + Join us CTA.
  const de = locale === "de";
  const nav: SiteNavItem[] = [
    { label: de ? "Start" : "Home", to: "/" },
    {
      label: "Events",
      to: "/events",
      children: [
        { label: de ? "Events entdecken" : "Discover events", to: "/events#discover" },
        { label: de ? "Für Events anmelden" : "Register for events", to: "/events#register" },
      ],
    },
    { label: de ? "Kalender" : "Calendar", to: "/calendar" },
    { label: "Karaoke", to: "/karaoke" },
    { label: "Team", to: "/about/team" },
  ] as SiteNavItem[];
  const footer = site?.footer;

  return (
    <div className="shell theme-parchment">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.scrollIntoView();
          mainRef.current?.focus();
        }}
      >
        {locale === "de" ? "Zum Inhalt springen" : "Skip to content"}
      </a>
      {data.isDemo ? (
        <div className="demo-banner" role="note">
          <strong>{t("demo.banner_label")}</strong>: {t("demo.banner_body")}
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
                  locale={locale}
                  onOpen={setOpenGroup}
                  onToggle={toggleGroup}
                  onCloseGroup={() => setOpenGroup(null)}
                  onClose={closeGroup}
                />
              ))}
            {session.capabilities.length > 0 ? (
                <NavLink to="/admin" onClick={closeGroup}>
                  {t("nav.admin")}
                </NavLink>
              ) : null}
            </div>
            <div className="site-nav-controls">
              <NavLink to="/join" className="btn btn-outline btn-sm site-nav-cta" onClick={closeGroup}>
                {locale === "de" ? "Mitmachen" : "Join us"}
              </NavLink>
            </div>
          </div>
        </div>
      </nav>
      <main id="main-content" ref={mainRef} className="shell-main" tabIndex={-1}>
        <Outlet />
      </main>
      {footer ? (
        <footer className="site-footer">
          <div className="site-footer-inner">
            <span className="footer-coords" aria-hidden="true">50°46′ N · 6°05′ E</span>
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
              <li>
                <NavLink to="/about">{de ? "Über INCAS" : "About INCAS"}</NavLink>
              </li>
              <li>
                <NavLink to="/contact">{de ? "Kontakt" : "Contact"}</NavLink>
              </li>
            </ul>
          </div>
        </footer>
      ) : (
        <footer className="site-footer">INCAS</footer>
      )}
    </div>
  );
}
