import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useSession } from "../auth/SessionContext";
import { useCurrentLocale } from "../i18n/LocaleContext";

/**
 * Admin-only dark appearance. The switch is offered while an access key is
 * active and themes the whole site (public pages included) through
 * `html[data-theme="dark"]`; locking the admin returns visitors to the
 * regular light design. The choice is a per-device convenience.
 */
const STORAGE_KEY = "incas.admin.colorScheme";

function readStoredDark(): boolean {
  try {
    return globalThis.localStorage?.getItem?.(STORAGE_KEY) === "dark";
  } catch {
    return false;
  }
}

function storeDark(dark: boolean) {
  try {
    if (dark) globalThis.localStorage?.setItem?.(STORAGE_KEY, "dark");
    else globalThis.localStorage?.removeItem?.(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode); the switch still works for this visit.
  }
}

export function applyColorScheme(dark: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (dark) root.dataset.theme = "dark";
  else delete root.dataset.theme;
  root.style.colorScheme = dark ? "dark" : "";
}

/** Applied before the first render so an admin's dark choice does not flash light. */
export function applyStoredColorScheme() {
  applyColorScheme(readStoredDark());
}

type ColorSchemeState = {
  /** Whether the switch is offered (an admin capability is active). */
  available: boolean;
  dark: boolean;
  setDark: (dark: boolean) => void;
};

const ColorSchemeContext = createContext<ColorSchemeState | null>(null);

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const [preferDark, setPreferDark] = useState(readStoredDark);
  const available = session.capabilities.length > 0;
  // Keep the stored choice while the session is still loading to avoid a flash.
  const dark = preferDark && (available || session.loading);

  useEffect(() => {
    applyColorScheme(dark);
  }, [dark]);

  const setDark = useCallback((next: boolean) => {
    storeDark(next);
    setPreferDark(next);
  }, []);

  const value = useMemo(() => ({ available, dark, setDark }), [available, dark, setDark]);
  return <ColorSchemeContext.Provider value={value}>{children}</ColorSchemeContext.Provider>;
}

const UNAVAILABLE: ColorSchemeState = { available: false, dark: false, setDark: () => undefined };

/** Outside ColorSchemeProvider (isolated layout tests) the switch is simply not offered. */
export function useColorScheme(): ColorSchemeState {
  return useContext(ColorSchemeContext) ?? UNAVAILABLE;
}

/**
 * Light/dark switch shown in the admin sidebar and in the site navigation.
 * `compact` keeps only the icon visible (the name stays for assistive tech).
 */
export function ColorSchemeToggle({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const { available, dark, setDark } = useColorScheme();
  const de = useCurrentLocale() === "de";
  if (!available) return null;
  // A toggle button keeps one name; aria-pressed carries the on/off state.
  return (
    <button
      type="button"
      className={`color-scheme-toggle${compact ? " is-compact" : ""} ${className}`.trim()}
      aria-pressed={dark}
      title={de ? "Helles oder dunkles Design umschalten" : "Toggle light or dark appearance"}
      onClick={() => setDark(!dark)}
    >
      <i className={`bi ${dark ? "bi-moon-stars-fill" : "bi-moon-stars"}`} aria-hidden="true" />
      <span className={compact ? "sr-only" : undefined}>{de ? "Dunkles Design" : "Dark theme"}</span>
    </button>
  );
}
