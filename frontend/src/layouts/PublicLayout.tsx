import { NavLink, Outlet } from "react-router-dom";

import { useSession } from "../auth/SessionContext";
import { useData } from "../data/DataProviderContext";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/calendar", label: "Calendar" },
  { to: "/karaoke", label: "Karaoke" },
  { to: "/team", label: "Team" },
  { to: "/tandem", label: "Language Tandem" },
];

export function PublicLayout() {
  const data = useData();
  const session = useSession();

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
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === "/"}>
                {link.label}
              </NavLink>
            ))}
            {session.capabilities.length > 0 || data.isDemo ? (
              <NavLink to="/admin">Admin</NavLink>
            ) : null}
          </div>
        </div>
      </nav>
      <main className="shell-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        INCAS — Intercultural Centre of Aachen Students
      </footer>
    </div>
  );
}
