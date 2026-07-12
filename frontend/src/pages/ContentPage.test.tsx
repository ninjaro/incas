import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { DataProviderProvider } from "../data/DataProviderContext";
import { DemoDataProvider } from "../data/DemoDataProvider";
import { LocaleProvider } from "../i18n/LocaleContext";
import { ContentPage } from "./ContentPage";

// This suite doesn't run with vitest's `globals: true`, so
// @testing-library/react's automatic afterEach(cleanup) never registers.
afterEach(() => {
  cleanup();
});

function renderPage(slug: string) {
  return render(
    <DataProviderProvider provider={new DemoDataProvider()}>
      <LocaleProvider>
        <MemoryRouter>
          <ContentPage slug={slug} />
        </MemoryRouter>
      </LocaleProvider>
    </DataProviderProvider>,
  );
}

describe("ContentPage", () => {
  it("renders the page title and body", async () => {
    renderPage("about");
    await waitFor(() => expect(screen.getByText("About us")).toBeTruthy());
  });

  it("shows a not-found state for unknown slugs", async () => {
    renderPage("nope");
    await waitFor(() => expect(screen.getByText(/not found/i)).toBeTruthy());
  });

  it("rejects a valid slug requested through the wrong section", async () => {
    render(
      <DataProviderProvider provider={new DemoDataProvider()}>
        <LocaleProvider>
          <MemoryRouter>
            <ContentPage slug="about" section="offers" />
          </MemoryRouter>
        </LocaleProvider>
      </DataProviderProvider>,
    );
    await waitFor(() => expect(screen.getByText(/not found/i)).toBeInTheDocument());
  });

  it("renders meaningful image metadata and static FAQ headings", async () => {
    const { rerender } = renderPage("about");
    const image = await screen.findByRole("img", { name: /INCAS volunteers/i });
    expect(image).toHaveAttribute("width", "1600");
    expect(image).toHaveAttribute("height", "1200");

    rerender(
      <DataProviderProvider provider={new DemoDataProvider()}>
        <LocaleProvider>
          <MemoryRouter>
            <ContentPage slug="international-weekend" section="offers" />
          </MemoryRouter>
        </LocaleProvider>
      </DataProviderProvider>,
    );
    await waitFor(() => expect(screen.getByText("When are the trips?")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "When are the trips?" })).not.toBeInTheDocument();
  });

  it("shows a generic error state (not the not-found copy) for non-404 failures", async () => {
    const provider = new DemoDataProvider();
    provider.getContent = () => Promise.reject(new Error("network down"));

    render(
      <DataProviderProvider provider={provider}>
        <LocaleProvider>
          <MemoryRouter>
            <ContentPage slug="about" />
          </MemoryRouter>
        </LocaleProvider>
      </DataProviderProvider>,
    );

    await waitFor(() => expect(screen.getByText("Something went wrong")).toBeInTheDocument());
    expect(screen.queryByText(/page you are looking for does not exist/i)).not.toBeInTheDocument();
  });

  it("keeps an in-body legacy /events link inside the SPA instead of a full page load", async () => {
    // The "international-tuesday" content page body links to the legacy
    // `/events` path (e.g. "checking our event calendar"). Since the app is
    // a HashRouter SPA, a raw <a href="/events"> click must be intercepted
    // and routed to /calendar instead of causing a real browser navigation.
    const user = userEvent.setup();
    render(
      <DataProviderProvider provider={new DemoDataProvider()}>
        <LocaleProvider>
          <MemoryRouter initialEntries={["/offers/international-tuesday"]}>
            <Routes>
              <Route path="/offers/:slug" element={<ContentPage />} />
              <Route path="/calendar" element={<div>Calendar route reached</div>} />
            </Routes>
          </MemoryRouter>
        </LocaleProvider>
      </DataProviderProvider>,
    );

    const link = await screen.findByRole("link", { name: /event calendar/i });
    expect(link).toHaveAttribute("href", "/events");

    await user.click(link);

    // If the click were not intercepted, jsdom would not perform a real
    // navigation and the SPA would stay stuck on the content page, so
    // "Calendar route reached" only appears because navigate() was called.
    await waitFor(() => expect(screen.getByText("Calendar route reached")).toBeInTheDocument());
  });

  it("keeps authored fragment navigation inside the current HashRouter route", async () => {
    const user = userEvent.setup();
    const scrollIntoView = HTMLElement.prototype.scrollIntoView;
    let scrolled = false;
    HTMLElement.prototype.scrollIntoView = () => { scrolled = true; };
    renderPage("language-tandem");
    const link = await screen.findByRole("link", { name: /Go to Sprachtandem form/i });
    await waitFor(() => expect(document.getElementById("page-form")).toBeInTheDocument());
    await user.click(link);
    expect(scrolled).toBe(true);
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
  });
});
