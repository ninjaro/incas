import { useState, type FormEvent } from "react";
import { NavLink, Outlet } from "react-router-dom";

import type { Capability } from "../../api/types";
import { useSession } from "../../auth/SessionContext";
import { useData } from "../../data/DataProviderContext";

type AdminNavItem = {
  to: string;
  label: string;
  capability: Capability | null;
};

const ADMIN_NAV: AdminNavItem[] = [
  { to: "/admin", label: "Dashboard", capability: null },
  { to: "/admin/posts", label: "Posts & Events", capability: "posts" },
  { to: "/admin/themes", label: "Themes", capability: "theme_review" },
  { to: "/admin/karaoke", label: "Karaoke Queue", capability: "karaoke_queue" },
  { to: "/admin/tandem", label: "Language Tandem", capability: "language_tandem_blind" },
];

function UnlockForm() {
  const session = useSession();
  const data = useData();
  const [key, setKey] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    try {
      const result = await session.unlock(key);
      setKey("");
      setMessage({
        tone: "ok",
        text: `Unlocked: ${(result.newScopes ?? []).join(", ") || "already active"}`,
      });
    } catch {
      setMessage({ tone: "bad", text: "This access key is not valid." });
    }
  };

  return (
    <form onSubmit={submit} className="card" style={{ padding: 14, marginTop: 16 }}>
      <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>
        Activate another key
        <input
          type="password"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          placeholder="Access key"
          style={{ width: "100%", marginTop: 4, padding: "6px 10px" }}
        />
      </label>
      {data.isDemo ? (
        <p style={{ fontSize: "0.75rem", color: "var(--ink-faint)", margin: "6px 0 0" }}>
          Demo keys: demo-admin, demo-review, demo-karaoke, demo-tandem-blind
        </p>
      ) : null}
      {message ? <p className={`notice notice-${message.tone}`}>{message.text}</p> : null}
      <button type="submit" className="btn btn-outline btn-sm" style={{ marginTop: 8 }}>
        Unlock
      </button>
    </form>
  );
}

export function AdminLayout() {
  const session = useSession();

  return (
    <div className="admin-shell">
      <aside>
        <nav className="admin-sidenav" aria-label="Admin navigation">
          {ADMIN_NAV.map((item) => {
            const locked = item.capability !== null && !session.hasCapability(item.capability);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/admin"}
                className={locked ? "is-locked" : undefined}
                aria-disabled={locked}
                title={locked ? "Requires an additional access key" : undefined}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <UnlockForm />
        {session.capabilities.length > 0 ? (
          <div className="capability-chips" aria-label="Active capabilities">
            {session.capabilities.map((capability) => (
              <span key={capability} className="badge badge-brand">
                {session.capabilityLabels[capability] ?? capability}
              </span>
            ))}
          </div>
        ) : null}
      </aside>
      <div>
        <Outlet />
      </div>
    </div>
  );
}
