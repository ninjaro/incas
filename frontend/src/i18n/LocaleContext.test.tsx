import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataProviderProvider } from "../data/DataProviderContext";
import { DemoDataProvider } from "../data/DemoDataProvider";
import { LocaleProvider, useLocale, useT } from "./LocaleContext";

function Probe() {
  const t = useT();
  const { locale, setLocale } = useLocale();
  return (
    <div>
      <span data-testid="home">{t("nav.home")}</span>
      <span data-testid="missing">{t("nope.key")}</span>
      <span data-testid="locale">{locale}</span>
      <button onClick={() => setLocale("de")}>de</button>
    </div>
  );
}

describe("LocaleContext", () => {
  it("provides translations and falls back to the key", async () => {
    render(
      <DataProviderProvider provider={new DemoDataProvider()}>
        <LocaleProvider>
          <Probe />
        </LocaleProvider>
      </DataProviderProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("home").textContent).toBe("Home"));
    expect(screen.getByTestId("missing").textContent).toBe("nope.key");
  });
});
