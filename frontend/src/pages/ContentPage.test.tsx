import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { DataProviderProvider } from "../data/DataProviderContext";
import { DemoDataProvider } from "../data/DemoDataProvider";
import { LocaleProvider } from "../i18n/LocaleContext";
import { ContentPage } from "./ContentPage";

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
});
