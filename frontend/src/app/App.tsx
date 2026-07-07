import { RouterProvider } from "react-router-dom";

import { SessionProvider } from "../auth/SessionContext";
import { DataProviderProvider } from "../data/DataProviderContext";
import { router } from "../router";

export function App() {
  return (
    <DataProviderProvider>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </DataProviderProvider>
  );
}
