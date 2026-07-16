import { Navigate, createBrowserRouter, createHashRouter } from "react-router-dom";
import type { ReactNode } from "react";

import type { Capability } from "../api/types";
import { useSession } from "../auth/SessionContext";
import { Loading } from "../components/ui";
import { AdminLayout } from "../features/admin/AdminLayout";
import { AccessKeysPanel } from "../features/admin/AccessKeysPanel";
import { DashboardPage } from "../features/admin/DashboardPage";
import { KaraokePanel } from "../features/admin/KaraokePanel";
import { EventRegistrationsPanel } from "../features/admin/EventRegistrationsPanel";
import { FormsInboxPanel } from "../features/admin/FormsInboxPanel";
import { PaymentsPanel } from "../features/admin/PaymentsPanel";
import { SocialPublicationsPanel } from "../features/admin/SocialPublicationsPanel";
import { PostsPanel } from "../features/admin/PostsPanel";
import { TandemPanel } from "../features/admin/TandemPanel";
import { ThemesPanel } from "../features/admin/ThemesPanel";
import { PublicLayout } from "../layouts/PublicLayout";
import { AboutLayout, OffersLayout } from "../layouts/SectionLayouts";
import { CalendarPage } from "../pages/CalendarPage";
import { AboutPage } from "../pages/AboutPage";
import { ContactPage } from "../pages/ContactPage";
import { ContentPage } from "../pages/ContentPage";
import { EventDetailPage } from "../pages/EventDetailPage";
import { LandingPage } from "../pages/LandingPage";
import { OffersPage } from "../pages/OffersPage";
import { RegistrationStatusPage } from "../pages/RegistrationStatusPage";
import { SuggestEventPage } from "../pages/SuggestEventPage";
import { TandemFormPage } from "../pages/TandemFormPage";
import { TeamPage } from "../pages/TeamPage";
import { useLocale } from "../i18n/LocaleContext";

function RequireCapability({
  capability,
  children,
}: {
  capability: Capability;
  children: ReactNode;
}) {
  const session = useSession();
  const { locale } = useLocale();
  const de = locale === "de";
  if (session.loading) return <Loading />;
  if (!session.hasCapability(capability)) {
    return (
      <div className="state-box">
        <p>
          {de ? "Dieser Bereich benötigt die Berechtigung" : "This panel requires the capability"}{" "}
          <strong>{session.capabilityLabels[capability] ?? capability}</strong>.
        </p>
        <p>{de ? "Aktiviere links einen passenden Zugangsschlüssel. Eine Abmeldung ist nicht nötig." : "Activate a matching access key in the sidebar. No logout is needed."}</p>
      </div>
    );
  }
  return <>{children}</>;
}

function NotFound() {
  const { locale } = useLocale();
  const de = locale === "de";
  return (
    <div className="state-box">
      <h1>{de ? "Seite nicht gefunden" : "Page not found"}</h1>
      <p>{de ? "Die gesuchte Seite existiert nicht." : "The page you are looking for does not exist."}</p>
    </div>
  );
}

const routes = [
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/calendar", element: <CalendarPage /> },
      { path: "/events/:slug", element: <EventDetailPage /> },
      { path: "/team", element: <Navigate to="/about/team" replace /> },
      { path: "/tandem", element: <TandemFormPage /> },
      {
        path: "/about",
        element: <AboutLayout />,
        children: [
          { index: true, element: <AboutPage /> },
          { path: "working-groups", element: <ContentPage slug="working-groups" section="about" /> },
          { path: "team-meetings", element: <ContentPage slug="team-meetings" section="about" /> },
          { path: "team", element: <TeamPage /> },
          { path: "*", element: <NotFound /> },
        ],
      },
      {
        path: "/offers",
        element: <OffersLayout />,
        children: [
          { index: true, element: <OffersPage /> },
          { path: ":slug", element: <ContentPage section="offers" /> },
        ],
      },
      { path: "/contact", element: <ContactPage /> },
      { path: "/suggest-event", element: <SuggestEventPage /> },
      { path: "/registrations/:publicId", element: <RegistrationStatusPage /> },
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
            path: "registrations",
            element: <RequireCapability capability="event_registrations"><EventRegistrationsPanel /></RequireCapability>,
          },
          {
            path: "forms",
            element: <RequireCapability capability="forms"><FormsInboxPanel /></RequireCapability>,
          },
          {
            path: "access-keys",
            element: <RequireCapability capability="access_keys"><AccessKeysPanel /></RequireCapability>,
          },
          {
            path: "payments",
            element: <RequireCapability capability="event_registrations"><PaymentsPanel /></RequireCapability>,
          },
          {
            path: "social",
            element: <RequireCapability capability="posts"><SocialPublicationsPanel /></RequireCapability>,
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
];

export const router = import.meta.env.VITE_DATA_MODE === "demo"
  ? createHashRouter(routes)
  : createBrowserRouter(routes);
