import { RouterProvider } from "react-router-dom";

import { SessionProvider } from "../auth/SessionContext";
import { DataProviderProvider } from "../data/DataProviderContext";
import { LocaleProvider } from "../i18n/LocaleContext";
import { router } from "../router";

export function App() {
  return (
    <DataProviderProvider>
      <LocaleProvider>
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
      </LocaleProvider>
    </DataProviderProvider>
  );
}
