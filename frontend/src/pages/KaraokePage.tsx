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
      <header className="page-hero karaoke-hero">
        <h1>{de ? "Song-Warteschlange" : "Song Queue"}</h1>
        <p>{de ? "Wünsch dir einen Song und verfolge deinen Platz in der Warteschlange." : "Request a song and track your spot in the queue."}</p>
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
