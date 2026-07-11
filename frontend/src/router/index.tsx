import { createHashRouter } from "react-router-dom";
import type { ReactNode } from "react";

import type { Capability } from "../api/types";
import { useSession } from "../auth/SessionContext";
import { Loading } from "../components/ui";
import { AdminLayout } from "../features/admin/AdminLayout";
import { DashboardPage } from "../features/admin/DashboardPage";
import { KaraokePanel } from "../features/admin/KaraokePanel";
import { PostsPanel } from "../features/admin/PostsPanel";
import { TandemPanel } from "../features/admin/TandemPanel";
import { ThemesPanel } from "../features/admin/ThemesPanel";
import { KaraokePublicPage } from "../features/karaoke/KaraokePublicPage";
import { PublicLayout } from "../layouts/PublicLayout";
import { CalendarPage } from "../pages/CalendarPage";
import { ContactPage } from "../pages/ContactPage";
import { ContentPage } from "../pages/ContentPage";
import { EventDetailPage } from "../pages/EventDetailPage";
import { LandingPage } from "../pages/LandingPage";
import { OffersPage } from "../pages/OffersPage";
import { TandemFormPage } from "../pages/TandemFormPage";
import { TeamPage } from "../pages/TeamPage";

function RequireCapability({
  capability,
  children,
}: {
  capability: Capability;
  children: ReactNode;
}) {
  const session = useSession();
  if (session.loading) return <Loading />;
  if (!session.hasCapability(capability)) {
    return (
      <div className="state-box">
        <p>
          🔒 This panel requires the <strong>{session.capabilityLabels[capability] ?? capability}</strong>{" "}
          capability.
        </p>
        <p>Activate a matching access key in the sidebar — no logout needed.</p>
      </div>
    );
  }
  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="state-box">
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
    </div>
  );
}

export const router = createHashRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/calendar", element: <CalendarPage /> },
      { path: "/events/:slug", element: <EventDetailPage /> },
      { path: "/team", element: <TeamPage /> },
      { path: "/karaoke", element: <KaraokePublicPage /> },
      { path: "/tandem", element: <TandemFormPage /> },
      { path: "/about", element: <ContentPage slug="about" /> },
      { path: "/about/working-groups", element: <ContentPage slug="working-groups" /> },
      { path: "/about/team-meetings", element: <ContentPage slug="team-meetings" /> },
      { path: "/offers", element: <OffersPage /> },
      { path: "/offers/:slug", element: <ContentPage /> },
      { path: "/contact", element: <ContactPage /> },
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          {
            path: "posts",
            element: (
              <RequireCapability capability="posts">
                <PostsPanel />
              </RequireCapability>
            ),
          },
          {
            path: "themes",
            element: (
              <RequireCapability capability="theme_review">
                <ThemesPanel />
              </RequireCapability>
            ),
          },
          {
            path: "karaoke",
            element: (
              <RequireCapability capability="karaoke_queue">
                <KaraokePanel />
              </RequireCapability>
            ),
          },
          {
            path: "tandem",
            element: (
              <RequireCapability capability="language_tandem_blind">
                <TandemPanel />
              </RequireCapability>
            ),
          },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
