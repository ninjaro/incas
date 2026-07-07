import { useSearchParams } from "react-router-dom";

import type { PageId } from "../../api/types";
import { useSession } from "../../auth/SessionContext";
import { useData } from "../../data/DataProviderContext";
import { useAsync } from "../../hooks/useAsync";
import { resolveTheme } from "./registry";

/**
 * Resolves which theme variant a public page should render.
 *
 * Normal visitors always get the backend-resolved public theme; there is no
 * visitor-facing selector. Admin sessions with theme_review may pass
 * ?previewTheme=<id> to preview a variant locally without changing the
 * public theme.
 */
export function usePublicTheme(pageId: PageId): { theme: string; isPreview: boolean; loading: boolean } {
  const data = useData();
  const session = useSession();
  const [searchParams] = useSearchParams();

  const config = useAsync(() => data.getPublicConfig(), []);

  const previewTheme = searchParams.get("previewTheme");
  const canPreview = session.hasCapability("theme_review");

  if (previewTheme && canPreview) {
    return { theme: resolveTheme(pageId, previewTheme), isPreview: true, loading: false };
  }

  return {
    theme: resolveTheme(pageId, config.data?.themes[pageId]),
    isPreview: false,
    loading: config.loading,
  };
}
