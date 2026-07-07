import { createContext, useContext, useMemo, type ReactNode } from "react";

import { ApiDataProvider } from "./ApiDataProvider";
import type { DataProvider } from "./DataProvider";
import { DemoDataProvider } from "./DemoDataProvider";

const DataProviderContext = createContext<DataProvider | null>(null);

export function isDemoBuild(): boolean {
  return import.meta.env.VITE_DATA_MODE === "demo";
}

export function DataProviderProvider({
  provider,
  children,
}: {
  provider?: DataProvider;
  children: ReactNode;
}) {
  const value = useMemo(
    () => provider ?? (isDemoBuild() ? new DemoDataProvider() : new ApiDataProvider()),
    [provider],
  );
  return <DataProviderContext.Provider value={value}>{children}</DataProviderContext.Provider>;
}

export function useData(): DataProvider {
  const provider = useContext(DataProviderContext);
  if (!provider) {
    throw new Error("useData must be used inside DataProviderProvider");
  }
  return provider;
}
