import { useParams } from "react-router-dom";

import type { ContentPageResponse } from "../api/types";
import { Loading } from "../components/ui";
import { useData } from "../data/DataProviderContext";
import { useAsync } from "../hooks/useAsync";
import { useLocale } from "../i18n/LocaleContext";

export function ContentPage({ slug: fixedSlug }: { slug?: string }) {
  const data = useData();
  const { locale } = useLocale();
  const params = useParams();
  const slug = fixedSlug ?? params.slug ?? "";
  const state = useAsync<ContentPageResponse>(
    () => data.getContent(slug, locale),
    [slug, locale],
  );

  if (state.loading) return <Loading />;
  if (state.error || !state.data) {
    return (
      <div className="state-box">
        <h1>Page not found</h1>
        <p>The page you are looking for does not exist.</p>
      </div>
    );
  }
  const page = state.data;
  return (
    <article className="content-page">
      <h1 className="content-page-title">{page.title}</h1>
      {page.image ? (
        <img
          className="content-page-image"
          src={`/static/${page.image}`}
          alt=""
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <div className="site-content" dangerouslySetInnerHTML={{ __html: page.bodyHtml }} />
    </article>
  );
}
