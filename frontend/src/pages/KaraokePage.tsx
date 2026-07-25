import { Link } from "react-router-dom";

import { EmptyState, ErrorState, Loading } from "../components/ui";
import { useData } from "../data/DataProviderContext";
import { KaraokeEventFeature } from "../features/karaoke/KaraokePublicPage";
import { useAsync } from "../hooks/useAsync";
import { useLocale } from "../i18n/LocaleContext";

export function KaraokePage() {
  const data = useData();
  const { locale } = useLocale();
  const de = locale === "de";
  const posts = useAsync(() => data.getPublicPosts(), [data]);

  if (posts.loading) return <Loading />;
  if (posts.error || !posts.data) return <ErrorState error={posts.error} onRetry={posts.reload} />;

  const karaokeEvent = posts.data.events.find((event) => event.eventKind === "karaoke");

  return (
    <>
      <header className="page-hero">
        <p className="hero-coords">50°46′ N · 6°05′ E · Aachen</p>
        <h1>
          {de ? (
            <>Karaoke <em>Nacht</em></>
          ) : (
            <>Karaoke <em>night</em></>
          )}
        </h1>
        <p>
          {de
            ? "Sing deine Lieblingssongs mit der INCAS Crowd. Wünsch dir hier einen Song für die nächste Karaoke-Nacht."
            : "Sing your favorite songs with the INCAS crowd. Request a song for the next karaoke night here."}
        </p>
      </header>

      {karaokeEvent ? (
        <KaraokeEventFeature eventSlug={karaokeEvent.slug} eventTitle={karaokeEvent.title.full} />
      ) : (
        <EmptyState>
          <p>
            {de
              ? "Gerade ist keine Karaoke-Nacht angekündigt. Die nächste taucht hier und im Kalender auf."
              : "No karaoke night is announced right now. The next one will appear here and on the calendar."}
          </p>
          <Link to="/calendar" className="btn btn-primary">
            {de ? "Zum Kalender" : "View calendar"}
          </Link>
        </EmptyState>
      )}
    </>
  );
}
