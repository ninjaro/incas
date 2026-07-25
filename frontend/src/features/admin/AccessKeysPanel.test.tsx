import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SessionProvider } from "../../auth/SessionContext";
import { DataProviderProvider } from "../../data/DataProviderContext";
import { DemoDataProvider } from "../../data/DemoDataProvider";
import { QrScanner } from "./AccessKeysPanel";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("QR scanner camera lifecycle", () => {
  it("stops every camera track when the scanner unmounts", async () => {
    const user = userEvent.setup();
    const stop = vi.fn();
    const getUserMedia = vi.fn(async () => ({
      getTracks: () => [{ stop }],
    }) as unknown as MediaStream);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    Object.defineProperty(window, "BarcodeDetector", {
      configurable: true,
      value: class {
        detect() {
          return new Promise(() => {});
        }
      },
    });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();

    const view = render(
      <DataProviderProvider provider={new DemoDataProvider()}>
        <SessionProvider>
          <QrScanner />
        </SessionProvider>
      </DataProviderProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Use camera" }));
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));
    view.unmount();
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
