import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SessionProvider } from "../auth/SessionContext";
import { DataProviderProvider } from "../data/DataProviderContext";
import { DemoDataProvider } from "../data/DemoDataProvider";
import { LocaleProvider } from "../i18n/LocaleContext";
import { PublicLayout } from "./PublicLayout";

// This suite doesn't run with vitest's `globals: true`, so
// @testing-library/react's automatic afterEach(cleanup) never registers.
afterEach(() => {
  cleanup();
});

// jsdom does not implement matchMedia; PublicLayout reads it to pick an
// initial appearance, so stub it before every test.
beforeEach(() => {
  window.matchMedia =
    window.matchMedia ??
    ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
});

function renderLayout(initialPath = "/") {
  return render(
    <DataProviderProvider provider={new DemoDataProvider()}>
      <LocaleProvider>
        <SessionProvider>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route index element={<div>Home content</div>} />
                <Route path="about" element={<div>About content</div>} />
                <Route path="about/working-groups" element={<div>Working groups content</div>} />
                <Route path="about/team-meetings" element={<div>Team meetings content</div>} />
                <Route path="calendar" element={<div>Calendar content</div>} />
                <Route path="*" element={<div>Fallback content</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </SessionProvider>
      </LocaleProvider>
    </DataProviderProvider>,
  );
}

describe("PublicLayout nav dropdown", () => {
  it("opens a group on click and closes it when a menu link is clicked (navigating away)", async () => {
    const user = userEvent.setup();
    renderLayout("/");

    const trigger = await screen.findByRole("button", { name: "About Us" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const aboutLink = screen.getByRole("link", { name: "About us" });
    expect(aboutLink).toBeInTheDocument();

    await user.click(aboutLink);

    await waitFor(() => expect(screen.getByText("About content")).toBeInTheDocument());
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the open group on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderLayout("/");

    const trigger = await screen.findByRole("button", { name: "About Us" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");

    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
  });

  it("closes the open group when clicking outside the nav", async () => {
    const user = userEvent.setup();
    renderLayout("/");

    const trigger = await screen.findByRole("button", { name: "About Us" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await waitFor(() => expect(screen.getByText("Home content")).toBeInTheDocument());
    await user.click(screen.getByText("Home content"));

    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
  });

  it("toggles a group closed when its trigger is clicked again", async () => {
    const user = userEvent.setup();
    renderLayout("/");

    const aboutTrigger = await screen.findByRole("button", { name: "About Us" });
    await user.click(aboutTrigger);
    expect(aboutTrigger).toHaveAttribute("aria-expanded", "true");

    await user.click(aboutTrigger);
    expect(aboutTrigger).toHaveAttribute("aria-expanded", "false");
  });
});
