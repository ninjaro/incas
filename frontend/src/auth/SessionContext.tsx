import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Capability, SessionInfo } from "../api/types";
import { useData } from "../data/DataProviderContext";

type SessionState = {
  loading: boolean;
  capabilities: Capability[];
  capabilityLabels: Record<string, string>;
  hasAccessKeys: boolean;
  hasCapability: (capability: Capability) => boolean;
  /** Activates another key without logging out and refreshes capabilities. */
  unlock: (key: string) => Promise<SessionInfo>;
  lock: () => Promise<void>;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const data = useData();
  const [loading, setLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [capabilityLabels, setCapabilityLabels] = useState<Record<string, string>>({});
  const [hasAccessKeys, setHasAccessKeys] = useState(false);
  const [nextExpiryAt, setNextExpiryAt] = useState<string | null>(null);

  const applySession = useCallback((session: SessionInfo) => {
    setCapabilities(session.capabilities);
    setCapabilityLabels(session.capabilityLabels);
    setHasAccessKeys(session.hasAccessKeys);
    setNextExpiryAt(session.nextExpiryAt);
  }, []);

  const refresh = useCallback(async () => {
    try {
      applySession(await data.getSession());
    } catch {
      // Keep the last known session during transient refresh failures. The
      // exact-expiry timer below still removes grants at their deadline.
    } finally {
      setLoading(false);
    }
  }, [applySession, data]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const fallback = window.setInterval(() => void refresh(), 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(fallback);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  useEffect(() => {
    if (!nextExpiryAt) return;
    const expiryTime = new Date(nextExpiryAt).getTime();
    const maximumDelay = 2_147_483_647;
    let timeout: number;
    const scheduleExpiry = () => {
      const delay = Math.max(expiryTime - Date.now() + 100, 0);
      if (delay > maximumDelay) {
        timeout = window.setTimeout(scheduleExpiry, maximumDelay);
        return;
      }
      timeout = window.setTimeout(() => {
        setCapabilities([]);
        setNextExpiryAt(null);
        void refresh();
      }, delay);
    };
    scheduleExpiry();
    return () => window.clearTimeout(timeout);
  }, [nextExpiryAt, refresh]);

  const unlock = useCallback(
    async (key: string) => {
      const session = await data.unlock(key);
      applySession(session);
      return session;
    },
    [applySession, data],
  );

  const lock = useCallback(async () => {
    applySession(await data.lock());
  }, [applySession, data]);

  const value = useMemo<SessionState>(
    () => ({
      loading,
      capabilities,
      capabilityLabels,
      hasAccessKeys,
      hasCapability: (capability) => capabilities.includes(capability),
      unlock,
      lock,
      refresh,
    }),
    [loading, capabilities, capabilityLabels, hasAccessKeys, unlock, lock, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return session;
}
