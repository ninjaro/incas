import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { DataProviderProvider } from "../../data/DataProviderContext";
import { DemoDataProvider } from "../../data/DemoDataProvider";
import { KaraokePanel } from "./KaraokePanel";

afterEach(cleanup);

describe("filtered Karaoke queue", () => {
  it("reorders against the complete event queue and disables boundary moves", async () => {
    const user = userEvent.setup();
    const provider = new DemoDataProvider();
    await provider.unlock("demo-karaoke");
    render(<DataProviderProvider provider={provider}><KaraokePanel /></DataProviderProvider>);

    await user.click(await screen.findByRole("button", { name: "approved" }));
    await screen.findByText("99 Luftballons");
    const moveJonasUp = screen.getByRole("button", { name: "Move 99 Luftballons up" });
    const moveAishaDown = screen.getByRole("button", { name: "Move Rolling in the Deep down" });
    await waitFor(() => expect(moveJonasUp).toBeEnabled());
    expect(moveAishaDown).toBeDisabled();

    const activeEvent = (screen.getByRole("combobox", { name: "Karaoke event" }) as HTMLSelectElement).value;
    await user.click(moveJonasUp);
    await waitFor(async () => {
      const queue = await provider.getAdminKaraoke(undefined, activeEvent);
      expect(queue.items.find((item) => item.id === 2)?.position).toBe(1);
      expect(queue.items.find((item) => item.id === 1)?.position).toBe(2);
    });
    expect(screen.queryByText(/queue changed/i)).not.toBeInTheDocument();
  });
});
