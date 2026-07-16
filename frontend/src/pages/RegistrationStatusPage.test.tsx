import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { DataProviderProvider } from "../data/DataProviderContext";
import { DemoDataProvider } from "../data/DemoDataProvider";
import { LocaleProvider } from "../i18n/LocaleContext";
import { RegistrationStatusPage } from "./RegistrationStatusPage";

afterEach(cleanup);

describe("RegistrationStatusPage", () => {
  it("initializes a pending payment from the registration response after reload", async () => {
    const provider = new DemoDataProvider();
    const event = (await provider.getPublicPosts()).events.find(
      (item) => item.registration?.priceCents,
    )!;
    const registration = await provider.registerForEvent(event.slug, {
      firstName: "Reload",
      lastName: "Payment",
      email: "reload-payment@example.org",
      occupation: "Student",
      dietPreference: event.eventKind === "breakfast" ? "vegetarian" : "",
      comment: "",
    });
    await provider.startCheckout(event.slug, registration.publicId);

    render(
      <DataProviderProvider provider={provider}>
        <LocaleProvider>
          <MemoryRouter initialEntries={[`/registrations/${registration.publicId}`]}>
            <Routes>
              <Route
                path="/registrations/:publicId"
                element={<RegistrationStatusPage />}
              />
            </Routes>
          </MemoryRouter>
        </LocaleProvider>
      </DataProviderProvider>,
    );

    expect(await screen.findByRole("button", { name: "Resume payment" }))
      .toBeInTheDocument();
    expect(screen.getByText(/Payment status: pending/)).toBeInTheDocument();
  });
});
