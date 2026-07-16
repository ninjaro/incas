import { useCallback, type CSSProperties, type MouseEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type { ContentPageResponse, ContentSection } from "../api/types";
import { Loading } from "../components/ui";
import { useData } from "../data/DataProviderContext";
import { useAsync } from "../hooks/useAsync";
import { useLocale, useT } from "../i18n/LocaleContext";
import { assetUrl } from "../utils/assets";
import { SuggestEventForm } from "./SuggestEventPage";
import { TandemEmbeddedForm } from "./TandemFormPage";

// In-body content is authored against legacy absolute paths (e.g. `/events`).
// Keep clicks inside React and translate paths whose canonical route changed.
// This map translates legacy paths that changed shape in the new app; every
// other internal path (offers, about, suggest-event, ...) is already a
// valid app route and passes through unchanged.
const LEGACY_PATH_MAP: Record<string, string> = {
  "/events": "/calendar",
  "/contacts": "/contact",
  "/contact-form": "/contact?form=general",
  "/language-tandem": "/tandem",
};

function isInternalPath(href: string): boolean {
  // A single leading "/" is an internal, same-origin path. "//host/..." is
  // protocol-relative (external); "#..." is a same-page fragment.
  return href.startsWith("/") && !href.startsWith("//");
}

function mapLegacyHref(href: string): string {
  const match = href.match(/^([^?#]*)([?#].*)?$/);
  const path = match?.[1] ?? href;
  const rest = match?.[2] ?? "";
  return (LEGACY_PATH_MAP[path] ?? path) + rest;
}

export function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; status?: number };
  return err.code === "not_found" || err.status === 404;
}

export function ContentNotFound() {
  const t = useT();
  return (
    <div className="state-box">
      <h1>{t("content.not_found_title")}</h1>
      <p>{t("content.not_found_body")}</p>
    </div>
  );
}

export function ContentArticle({ page }: { page: ContentPageResponse }) {
  const navigate = useNavigate();

  // Delegated click handler: intercept clicks on internal in-body links and
  // route them through react-router instead of letting the browser load the
  // legacy Jinja page. External links, mailto:/tel:, pure fragment links,
  // target="_blank" links, and modified clicks (new tab/window) are left
  // alone so they behave normally.
  const handleContentClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement).closest?.("a");
      if (!anchor) return;
      if (anchor.target === "_blank") return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#") && href.length > 1) {
        const target = document.getElementById(decodeURIComponent(href.slice(1)));
        if (target) {
          event.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }
      if (!isInternalPath(href)) return;
      event.preventDefault();
      navigate(mapLegacyHref(href));
    },
    [navigate],
  );

  const imageUrl = assetUrl(page.image);
  const imageStyle = {
    aspectRatio: page.imageAspectRatio ?? undefined,
    objectPosition: page.imageObjectPosition ?? undefined,
  } satisfies CSSProperties;
  return (
    <article className="content-page">
      <h1 className="content-page-title">{page.title}</h1>
      {imageUrl ? (
        <img
          className="content-page-image"
          src={imageUrl}
          alt={page.imageAlt}
          width={page.imageWidth ?? undefined}
          height={page.imageHeight ?? undefined}
          loading={page.imagePriority ? "eager" : "lazy"}
          fetchPriority={page.imagePriority ? "high" : "auto"}
          style={imageStyle}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <div
        className="site-content"
        onClick={handleContentClick}
        dangerouslySetInnerHTML={{ __html: page.bodyHtml }}
      />
      {page.form ? (
        <section id="page-form" className="embedded-page-form" aria-label={`${page.title} form`}>
          {page.form.type === "suggest_event" ? (
            <SuggestEventForm
              initialKind={page.form.preset?.kind === "breakfast" ? "breakfast" : "country_evening"}
            />
          ) : (
            <TandemEmbeddedForm />
          )}
        </section>
      ) : null}
    </article>
  );
}

export function ContentPage({
  slug: fixedSlug,
  section,
}: {
  slug?: string;
  section?: ContentSection;
}) {
  const data = useData();
  const { locale } = useLocale();
  const t = useT();
  const params = useParams();
  const slug = fixedSlug ?? params.slug ?? "";
  const state = useAsync<ContentPageResponse>(
    () => data.getContent(slug, locale, section),
    [slug, locale, section],
  );

  if (state.loading) return <Loading />;
  if (state.error || !state.data) {
    if (isNotFoundError(state.error)) return <ContentNotFound />;
    return (
      <div className="state-box state-error" role="alert">
        <h1>{t("content.error_title")}</h1>
        <p>{t("content.error_body")}</p>
      </div>
    );
  }
  return <ContentArticle page={state.data} />;
}
