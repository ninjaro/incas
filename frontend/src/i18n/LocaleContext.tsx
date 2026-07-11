import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { Locale, SiteResponse } from "../api/types";
import { useData } from "../data/DataProviderContext";

const SUPPORTED: Locale[] = ["en", "de"];
const STORAGE_KEY = "incas.locale";

function readCookieLocale(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)locale=(en|de)/);
  return match ? (match[1] as Locale) : null;
}

function initialLocale(): Locale {
  const stored = globalThis.localStorage?.getItem?.(STORAGE_KEY) as Locale | null;
  if (stored && SUPPORTED.includes(stored)) return stored;
  const cookie = readCookieLocale();
  if (cookie) return cookie;
  const browser = (globalThis.navigator?.language ?? "en").slice(0, 2) as Locale;
  return SUPPORTED.includes(browser) ? browser : "en";
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  site: SiteResponse | null;
  loading: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const data = useData();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [site, setSite] = useState<SiteResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    data.getSite(locale).then(
      (next) => {
        if (active) {
          setSite(next);
          setLoading(false);
        }
      },
      (err) => {
        console.error("Failed to load site data", err);
        if (active) {
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [data, locale]);

  const setLocale = useCallback((next: Locale) => {
    globalThis.localStorage?.setItem?.(STORAGE_KEY, next);
    document.cookie = `locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    document.documentElement.lang = next;
    setLocaleState(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, site, loading }),
    [locale, setLocale, site, loading],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}

export function useT(): (key: string) => string {
  const { site } = useLocale();
  return useCallback((key: string) => site?.strings[key] ?? key, [site]);
}
