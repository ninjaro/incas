import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SessionProvider, useSession } from "../auth/SessionContext";
import { DataProviderProvider } from "../data/DataProviderContext";
import { DemoDataProvider } from "../data/DemoDataProvider";
import { AdminLayout } from "../features/admin/AdminLayout";
import { LocaleProvider } from "../i18n/LocaleContext";
import { ColorSchemeProvider, ColorSchemeToggle } from "./ColorScheme";

// The test runtime ships no usable Web Storage; give each test an in-memory one.
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, String(value)),
    removeItem: (key: string) => void values.delete(key),
    clear: () => values.clear(),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
});

function LockButton() {
  const session = useSession();
  return <button type="button" onClick={() => void session.lock()}>lock</button>;
}

function renderWith(provider: DemoDataProvider) {
  return render(
    <DataProviderProvider provider={provider}>
      <SessionProvider>
        <ColorSchemeProvider>
          <ColorSchemeToggle />
          <LockButton />
        </ColorSchemeProvider>
      </SessionProvider>
    </DataProviderProvider>,
  );
}

describe("admin colour scheme", () => {
  it("is not offered to visitors without an active access key", async () => {
    renderWith(new DemoDataProvider());
    await waitFor(() => expect(screen.getByRole("button", { name: "lock" })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Dark theme" })).not.toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("darkens the whole document for admins and reverts when the admin is locked", async () => {
    const user = userEvent.setup();
    const provider = new DemoDataProvider();
    await provider.unlock("demo-admin");
    renderWith(provider);

    const toggle = await screen.findByRole("button", { name: "Dark theme" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("incas.admin.colorScheme")).toBe("dark");

    await user.click(screen.getByRole("button", { name: "lock" }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBeUndefined());
    expect(screen.queryByRole("button", { name: "Dark theme" })).not.toBeInTheDocument();
  });
});

describe("admin localisation", () => {
  it("renders the admin sidebar in German", async () => {
    localStorage.setItem("incas.locale", "de");
    const provider = new DemoDataProvider();
    await provider.unlock("demo-admin");
    const router = createMemoryRouter([
      { path: "/admin", element: <AdminLayout />, children: [{ index: true, element: <div /> }] },
    ], { initialEntries: ["/admin"] });
    render(
      <DataProviderProvider provider={provider}>
        <LocaleProvider>
          <SessionProvider>
            <ColorSchemeProvider>
              <RouterProvider router={router} />
            </ColorSchemeProvider>
          </SessionProvider>
        </LocaleProvider>
      </DataProviderProvider>,
    );

    expect(await screen.findByRole("navigation", { name: "Admin-Navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Beiträge & Events" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Admin sperren" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dunkles Design" })).toBeInTheDocument();
    expect(screen.getByText("Zugangsschlüssel", { selector: ".badge" })).toBeInTheDocument();
  });
});
