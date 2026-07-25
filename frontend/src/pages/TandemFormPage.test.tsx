import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { SessionProvider } from "../auth/SessionContext";
import { DataProviderProvider } from "../data/DataProviderContext";
import { DemoDataProvider } from "../data/DemoDataProvider";
import { LocaleProvider } from "../i18n/LocaleContext";
import { TandemFormPage } from "./TandemFormPage";

afterEach(cleanup);

describe("Tandem step gating", () => {
  it("does not allow a direct Step 1 to Step 3 jump", async () => {
    const user = userEvent.setup();
    render(
      <DataProviderProvider provider={new DemoDataProvider()}>
        <LocaleProvider>
          <SessionProvider>
            <MemoryRouter>
              <TandemFormPage />
            </MemoryRouter>
          </SessionProvider>
        </LocaleProvider>
      </DataProviderProvider>,
    );

    expect(await screen.findByText("Step 1 of 3")).toBeInTheDocument();
    const preferences = screen.getByRole("button", { name: "3. Preferences" });
    expect(preferences).toBeDisabled();
    await user.click(preferences);
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByLabelText("First name")).toBeInTheDocument();
  });
});
