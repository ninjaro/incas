import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DataProviderProvider } from "../data/DataProviderContext";
import { DemoDataProvider } from "../data/DemoDataProvider";
import { SessionProvider, useSession } from "./SessionContext";

afterEach(cleanup);

function SessionProbe() {
  const session = useSession();
  return <div>{session.loading ? "loading" : session.capabilities.join(",") || "locked"}</div>;
}

describe("session expiration", () => {
  it("removes capabilities when the active generated key expires", async () => {
    const provider = new DemoDataProvider();
    await provider.unlock("demo-admin");
    const key = await provider.createAccessKey({
      label: "Short key",
      scopes: ["forms"],
      expiresAt: new Date(Date.now() + 250).toISOString(),
    });
    await provider.lock();
    await provider.unlock(key.secret);

    render(
      <DataProviderProvider provider={provider}>
        <SessionProvider><SessionProbe /></SessionProvider>
      </DataProviderProvider>,
    );
    expect(await screen.findByText("forms")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("locked")).toBeInTheDocument(), { timeout: 1_500 });
  });
});
