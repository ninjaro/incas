export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(?:https?:|data:|blob:)/.test(path)) return path;

  const clean = path.replace(/^\.\//, "").replace(/^\//, "").replace(/^static\//, "");
  return import.meta.env.VITE_DATA_MODE === "demo" ? `./${clean}` : `/static/${clean}`;
}

export function absoluteAppUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (import.meta.env.VITE_DATA_MODE === "demo") {
    return `${window.location.origin}${window.location.pathname}#${normalized}`;
  }
  return new URL(normalized, window.location.origin).toString();
}
