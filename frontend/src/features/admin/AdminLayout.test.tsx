import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { SessionProvider } from "../../auth/SessionContext";
import { DataProviderProvider } from "../../data/DataProviderContext";
import { DemoDataProvider } from "../../data/DemoDataProvider";
import { AdminLayout } from "./AdminLayout";

afterEach(cleanup);

describe("AdminLayout access controls", () => {
  it("renders locked destinations as non-links and can explicitly lock the session", async () => {
    const user = userEvent.setup();
    const provider = new DemoDataProvider();
    await provider.unlock("demo-review");
    const router = createMemoryRouter([
      { path: "/", element: <div>Public home</div> },
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <div>Dashboard content</div> },
          { path: "themes", element: <div>Themes content</div> },
        ],
      },
    ], { initialEntries: ["/admin"] });
    render(
      <DataProviderProvider provider={provider}>
        <SessionProvider><RouterProvider router={router} /></SessionProvider>
      </DataProviderProvider>,
    );

    const navigation = await screen.findByRole("navigation", { name: "Admin navigation" });
    expect(within(navigation).queryByRole("link", { name: /Posts & Events/ })).not.toBeInTheDocument();
    expect(within(navigation).getByText("Posts & Events").closest("span")).toHaveAttribute("aria-disabled", "true");
    expect(within(navigation).getByRole("link", { name: "Themes" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Lock admin" }));
    expect(await screen.findByText("Public home")).toBeInTheDocument();
    expect((await provider.getSession()).capabilities).toEqual([]);
  });
});
