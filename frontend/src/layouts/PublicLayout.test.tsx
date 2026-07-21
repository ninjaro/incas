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
  window.scrollTo = () => {};
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
                <Route path="about/team" element={<div>Team content</div>} />
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

describe("PublicLayout About navigation", () => {
  it("hides Admin when keys exist but this session has no active capability", async () => {
    renderLayout("/");
    await screen.findByRole("link", { name: "About Us" });
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("keeps overview navigation separate from submenu disclosure", async () => {
    const user = userEvent.setup();
    renderLayout("/");

    const overview = await screen.findByRole("link", { name: "About Us" });
    const trigger = screen.getByRole("button", { name: "Open submenu: About Us" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("link", { name: "About us" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Working Groups" })).toBeInTheDocument();

    await user.click(overview);

    await waitFor(() => expect(screen.getByText("About content")).toBeInTheDocument());
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the open group on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderLayout("/");

    const trigger = await screen.findByRole("button", { name: "Open submenu: About Us" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");

    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
    expect(trigger).toHaveFocus();
  });

  it("closes the open group when clicking outside the nav", async () => {
    const user = userEvent.setup();
    renderLayout("/");

    const trigger = await screen.findByRole("button", { name: "Open submenu: About Us" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await waitFor(() => expect(screen.getByText("Home content")).toBeInTheDocument());
    await user.click(screen.getByText("Home content"));

    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
  });

  it("toggles a group closed when its trigger is clicked again", async () => {
    const user = userEvent.setup();
    renderLayout("/");

    const aboutTrigger = await screen.findByRole("button", { name: "Open submenu: About Us" });
    await user.click(aboutTrigger);
    expect(aboutTrigger).toHaveAttribute("aria-expanded", "true");

    await user.click(aboutTrigger);
    expect(aboutTrigger).toHaveAttribute("aria-expanded", "false");
  });

  it.each([
    ["/about", "About Us"],
    ["/about/working-groups", "Working Groups"],
    ["/about/team-meetings", "Team Meetings"],
    ["/about/team", "Team"],
  ])("marks exactly one current destination on %s", async (path, currentName) => {
    const user = userEvent.setup();
    renderLayout(path);
    const trigger = await screen.findByRole("button", { name: "Open submenu: About Us" });
    await user.click(trigger);
    const current = document.querySelectorAll('.site-nav-links [aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent(currentName);
  });

  it("keeps pointer hover and aria-expanded synchronized", async () => {
    const user = userEvent.setup();
    renderLayout("/");
    const trigger = await screen.findByRole("button", { name: "Open submenu: About Us" });
    await user.hover(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));
    await user.unhover(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
