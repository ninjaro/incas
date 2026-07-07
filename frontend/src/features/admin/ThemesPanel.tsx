import { useState } from "react";
import { Link } from "react-router-dom";

import { ApiError } from "../../api/client";
import type { PageId, ThemePageInfo } from "../../api/types";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
} from "../../components/ui";
import { useData } from "../../data/DataProviderContext";
import { useAsync } from "../../hooks/useAsync";

const PREVIEW_ROUTES: Partial<Record<PageId, string>> = {
  landing: "/",
  calendar: "/calendar",
  language_tandem: "/tandem",
  team: "/team",
  admin_dashboard: "/admin",
};

function formatRemaining(untilIso: string): string {
  const ms = new Date(untilIso).getTime() - Date.now();
  if (ms <= 0) return "now";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.round((ms % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function ThemePageCard({
  page,
  canForce,
  onVote,
  onForce,
}: {
  page: ThemePageInfo;
  canForce: boolean;
  onVote: (page: PageId, theme: string) => void;
  onForce: (page: PageId, theme: string) => void;
}) {
  const previewRoute = PREVIEW_ROUTES[page.pageId];

  return (
    <section className="card" aria-label={page.name}>
      <div className="page-header-row">
        <h3 style={{ margin: 0 }}>{page.name}</h3>
        <div>
          {page.forceLock.isLocked && page.forceLock.lockedUntil ? (
            <span className="badge badge-warn" title={`Next change at ${page.forceLock.lockedUntil}`}>
              Force locked · {formatRemaining(page.forceLock.lockedUntil)} left
            </span>
          ) : null}
        </div>
      </div>
      <div className="theme-page-grid">
        {page.themes.map((theme) => {
          const isPublic = theme.themeId === page.publicTheme;
          const isMyVote = theme.themeId === page.myVote;
          return (
            <div
              key={theme.themeId}
              className={`theme-option${isPublic ? " is-public" : ""}`}
            >
              <div className="theme-option-head">
                <strong>{theme.name}</strong>
                <span>
                  {isPublic ? <span className="badge badge-brand">Public</span> : null}{" "}
                  {theme.isDefault ? <span className="badge badge-neutral">Default</span> : null}
                </span>
              </div>
              <p>{theme.description}</p>
              <p style={{ fontSize: "0.82rem", color: "var(--ink-faint)" }}>
                {theme.votes ?? 0} vote{(theme.votes ?? 0) === 1 ? "" : "s"}
                {isMyVote ? " · your vote" : ""}
              </p>
              <div className="theme-option-actions">
                {previewRoute ? (
                  <Link
                    className="btn btn-ghost btn-sm"
                    to={`${previewRoute}?previewTheme=${theme.themeId}`}
                  >
                    Preview
                  </Link>
                ) : null}
                <button
                  type="button"
                  className={`btn btn-sm ${isMyVote ? "btn-primary" : "btn-outline"}`}
                  onClick={() => onVote(page.pageId, theme.themeId)}
                >
                  {isMyVote ? "Voted" : "Vote"}
                </button>
                {canForce && !isPublic ? (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={page.forceLock.isLocked}
                    title={
                      page.forceLock.isLocked
                        ? "A theme can only be forced once per 24 hours"
                        : "Make this the public theme"
                    }
                    onClick={() => onForce(page.pageId, theme.themeId)}
                  >
                    Force public
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AuditList() {
  const data = useData();
  const audit = useAsync(() => data.getThemeAudit(), []);

  if (audit.loading) return <Loading />;
  if (audit.error) return <ErrorState error={audit.error} onRetry={audit.reload} />;

  const entries = audit.data?.entries ?? [];
  if (entries.length === 0) return <EmptyState>No theme changes yet.</EmptyState>;

  return (
    <table className="table">
      <thead>
        <tr>
          <th>When</th>
          <th>Page</th>
          <th>Change</th>
          <th>Session</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, index) => (
          <tr key={index}>
            <td>{new Date(entry.createdAt).toLocaleString()}</td>
            <td>{entry.pageId}</td>
            <td>
              {entry.previousTheme || "—"} → <strong>{entry.newTheme}</strong>
            </td>
            <td>
              <code>{entry.actor}</code>
            </td>
            <td>{entry.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ThemesPanel() {
  const data = useData();
  const themes = useAsync(() => data.getAdminThemes(), []);
  const [tab, setTab] = useState<"themes" | "audit">("themes");
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [pendingForce, setPendingForce] = useState<{ page: PageId; theme: string } | null>(null);

  const vote = async (page: PageId, theme: string) => {
    setNotice(null);
    try {
      await data.voteTheme(page, theme);
      themes.reload();
    } catch (error) {
      setNotice({ tone: "bad", text: error instanceof Error ? error.message : "Vote failed." });
    }
  };

  const force = async (page: PageId, theme: string) => {
    setPendingForce(null);
    setNotice(null);
    try {
      const result = await data.forceTheme(page, theme);
      setNotice({
        tone: "ok",
        text: `Public theme for ${page} is now "${result.publicTheme}". Next change possible at ${new Date(result.nextChangeAt).toLocaleString()}.`,
      });
      themes.reload();
    } catch (error) {
      if (error instanceof ApiError && error.code === "theme_force_locked") {
        const availableAt = error.details.availableAt as string | null;
        setNotice({
          tone: "bad",
          text: `This page theme cannot be changed yet${availableAt ? ` — available at ${new Date(availableAt).toLocaleString()}` : ""}.`,
        });
      } else {
        setNotice({ tone: "bad", text: error instanceof Error ? error.message : "Force failed." });
      }
      themes.reload();
    }
  };

  if (themes.loading) return <Loading />;
  if (themes.error) return <ErrorState error={themes.error} onRetry={themes.reload} />;

  const payload = themes.data;

  return (
    <>
      <PageHeader
        kicker="Theme governance"
        title="Page Themes"
        sub={
          payload?.canForce
            ? "Preview and vote for themes, or force the public theme. Each page can be forced at most once per 24 hours."
            : "Preview any theme and cast one vote per page. Forcing the public theme requires a stronger key."
        }
      />
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "themes"} onClick={() => setTab("themes")}>
          Themes & votes
        </button>
        <button type="button" role="tab" aria-selected={tab === "audit"} onClick={() => setTab("audit")}>
          Audit history
        </button>
      </div>
      {notice ? <p className={`notice notice-${notice.tone}`}>{notice.text}</p> : null}
      {tab === "audit" ? (
        <AuditList />
      ) : (
        (payload?.pages ?? []).map((page) => (
          <ThemePageCard
            key={page.pageId}
            page={page}
            canForce={payload?.canForce ?? false}
            onVote={vote}
            onForce={(pageId, theme) => setPendingForce({ page: pageId, theme })}
          />
        ))
      )}
      <ConfirmDialog
        open={pendingForce !== null}
        title="Force public theme?"
        body={
          pendingForce
            ? `Every visitor will see the "${pendingForce.theme}" theme on ${pendingForce.page}. This cannot be changed again for 24 hours.`
            : undefined
        }
        confirmLabel="Force theme"
        onConfirm={() => pendingForce && force(pendingForce.page, pendingForce.theme)}
        onCancel={() => setPendingForce(null)}
      />
    </>
  );
}
