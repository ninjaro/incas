import type { Page } from "@playwright/test";

const FIXED_NOW = "2026-07-11T10:00:00.000Z";

export async function freezeTime(page: Page) {
  await page.addInitScript((fixedNow) => {
    const NativeDate = Date;
    const fixedTimestamp = new NativeDate(fixedNow).valueOf();
    class FixedDate extends NativeDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        super(...(args.length ? args : [fixedTimestamp]));
      }

      static now() {
        return fixedTimestamp;
      }
    }
    globalThis.Date = FixedDate as DateConstructor;
  }, FIXED_NOW);
}

export async function unlockDemoAdmin(page: Page, key = "demo-admin") {
  await page.goto("/#/admin");
  await page.getByLabel("Activate another key").fill(key);
  await page.getByRole("button", { name: "Unlock" }).click();
  await page.getByText("Unlocked:").waitFor();
}
