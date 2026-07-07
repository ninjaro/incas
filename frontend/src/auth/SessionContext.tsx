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
  hasCapability: (capability: Capability) => boolean;
  /** Activates another key without logging out and refreshes capabilities. */
  unlock: (key: string) => Promise<SessionInfo>;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const data = useData();
  const [loading, setLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [capabilityLabels, setCapabilityLabels] = useState<Record<string, string>>({});

  const applySession = useCallback((session: SessionInfo) => {
    setCapabilities(session.capabilities);
    setCapabilityLabels(session.capabilityLabels);
  }, []);

  const refresh = useCallback(async () => {
    try {
      applySession(await data.getSession());
    } finally {
      setLoading(false);
    }
  }, [applySession, data]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const unlock = useCallback(
    async (key: string) => {
      const session = await data.unlock(key);
      applySession(session);
      return session;
    },
    [applySession, data],
  );

  const value = useMemo<SessionState>(
    () => ({
      loading,
      capabilities,
      capabilityLabels,
      hasCapability: (capability) => capabilities.includes(capability),
      unlock,
      refresh,
    }),
    [loading, capabilities, capabilityLabels, unlock, refresh],
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
