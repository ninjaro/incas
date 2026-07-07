import { Link } from "react-router-dom";

import type { Capability } from "../../api/types";
import { useSession } from "../../auth/SessionContext";
import { PageHeader } from "../../components/ui";
import { usePublicTheme } from "../themes/usePublicTheme";

type DashboardEntry = {
  to: string;
  title: string;
  description: string;
  capability: Capability;
};

const ENTRIES: DashboardEntry[] = [
  {
    to: "/admin/posts",
    title: "Posts & Events",
    description: "Drafts, templates, scheduling, and social publishing.",
    capability: "posts",
  },
  {
    to: "/admin/themes",
    title: "Page Themes",
    description: "Preview, vote, and manage the public look of each page.",
    capability: "theme_review",
  },
  {
    to: "/admin/karaoke",
    title: "Karaoke Queue",
    description: "Moderate song requests and run the live queue.",
    capability: "karaoke_queue",
  },
  {
    to: "/admin/tandem",
    title: "Language Tandem",
    description: "Match tandem partners; stronger keys reveal contact details.",
    capability: "language_tandem_blind",
  },
];

export function DashboardPage() {
  const session = useSession();
  const { theme } = usePublicTheme("admin_dashboard");

  const unlocked = ENTRIES.filter((entry) => session.hasCapability(entry.capability));
  const locked = ENTRIES.filter((entry) => !session.hasCapability(entry.capability));

  return (
    <>
      <PageHeader
        kicker="Admin"
        title="Dashboard"
        sub={
          session.capabilities.length === 0
            ? "Activate an access key in the sidebar to unlock admin panels."
            : "Panels unlocked by your current keys. Stronger keys reveal more controls inside the same panels."
        }
      />
      {theme === "compact" ? (
        <div className="card">
          {unlocked.map((entry) => (
            <p key={entry.to} style={{ margin: "6px 0" }}>
              <Link to={entry.to}>
                <strong>{entry.title}</strong>
              </Link>{" "}
              — {entry.description}
            </p>
          ))}
          {unlocked.length === 0 ? <p>No panels unlocked yet.</p> : null}
        </div>
      ) : (
        <div className="theme-page-grid">
          {unlocked.map((entry) => (
            <Link key={entry.to} to={entry.to} className="card" style={{ textDecoration: "none" }}>
              <h3 style={{ marginBottom: 4 }}>{entry.title}</h3>
              <p style={{ margin: 0, color: "var(--ink-soft)" }}>{entry.description}</p>
            </Link>
          ))}
        </div>
      )}
      {locked.length > 0 ? (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: "1rem", color: "var(--ink-faint)" }}>Locked capabilities</h2>
          <div className="capability-chips">
            {locked.map((entry) => (
              <span key={entry.to} className="badge badge-neutral" title={entry.description}>
                🔒 {entry.title}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
