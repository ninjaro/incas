export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(?:https?:|data:|blob:)/.test(path)) return path;

  const clean = path.replace(/^\.\//, "").replace(/^\//, "").replace(/^static\//, "");
  return import.meta.env.VITE_DATA_MODE === "demo" ? `./${clean}` : `/static/${clean}`;
}
