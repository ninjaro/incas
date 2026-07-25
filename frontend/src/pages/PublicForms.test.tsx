import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { DataProviderProvider } from "../data/DataProviderContext";
import { DemoDataProvider } from "../data/DemoDataProvider";
import { LocaleProvider } from "../i18n/LocaleContext";
import { ContactPage } from "./ContactPage";
import { SuggestEventForm } from "./SuggestEventPage";

afterEach(cleanup);

function Providers({ children }: { children: React.ReactNode }) {
  return <DataProviderProvider provider={new DemoDataProvider()}><LocaleProvider><MemoryRouter>{children}</MemoryRouter></LocaleProvider></DataProviderProvider>;
}

describe("public form UX", () => {
  it("opens only the selected Contact hub form and keeps Tandem separate", async () => {
    const user = userEvent.setup();
    render(
      <DataProviderProvider provider={new DemoDataProvider()}>
        <LocaleProvider>
          <MemoryRouter initialEntries={["/contact"]}>
            <Routes><Route path="/contact" element={<ContactPage />} /><Route path="/tandem" element={<div>Tandem workflow</div>} /></Routes>
          </MemoryRouter>
        </LocaleProvider>
      </DataProviderProvider>,
    );
    expect(screen.queryByLabelText("Message")).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: /General message/ }));
    expect(await screen.findByLabelText("Message")).toBeInTheDocument();
    expect(screen.queryByLabelText("Country or culture")).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: /Language Tandem/ }));
    expect(screen.getByText("Tandem workflow")).toBeInTheDocument();
  });

  it("normalizes an unknown Contact form value to the hub state", async () => {
    render(
      <DataProviderProvider provider={new DemoDataProvider()}>
        <LocaleProvider>
          <MemoryRouter initialEntries={["/contact?form=unknown"]}>
            <ContactPage />
          </MemoryRouter>
        </LocaleProvider>
      </DataProviderProvider>,
    );
    expect(await screen.findByText(/Choose an option above/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Message")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Country or culture")).not.toBeInTheDocument();
  });

  it("exposes the selected Contact option and preserves visible keyboard focus", async () => {
    const user = userEvent.setup();
    render(
      <DataProviderProvider provider={new DemoDataProvider()}>
        <LocaleProvider>
          <MemoryRouter initialEntries={["/contact?form=general"]}>
            <ContactPage />
          </MemoryRouter>
        </LocaleProvider>
      </DataProviderProvider>,
    );
    const selected = await screen.findByRole("link", { name: /General message/ });
    expect(selected).toHaveAttribute("aria-current", "page");
    selected.focus();
    expect(selected).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: /Suggest an event/ })).toHaveFocus();
  });

  it("syncs a pristine Suggest Event type but preserves edited input", async () => {
    const user = userEvent.setup();
    const view = render(<Providers><SuggestEventForm initialKind="country_evening" /></Providers>);
    const select = screen.getByLabelText("Event type");
    expect(select).toHaveValue("country_evening");
    view.rerender(<Providers><SuggestEventForm initialKind="breakfast" /></Providers>);
    await waitFor(() => expect(select).toHaveValue("breakfast"));
    await user.type(screen.getByLabelText("Country or culture"), "Turkish cuisine");
    view.rerender(<Providers><SuggestEventForm initialKind="country_evening" /></Providers>);
    expect(select).toHaveValue("breakfast");
    expect(screen.getByLabelText("Country or culture")).toHaveValue("Turkish cuisine");
  });
});
