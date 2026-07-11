import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { freezeTime, unlockDemoAdmin } from "./helpers";

async function expectNoA11yViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    })),
  ).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await freezeTime(page);
});

test("primary public and admin surfaces pass automated WCAG checks", async ({ page }) => {
  for (const route of ["/", "/#/offers", "/#/calendar", "/#/contact"]) {
    await page.goto(route);
    await page.locator(".shell-main").waitFor();
    await expectNoA11yViolations(page);
  }

  await unlockDemoAdmin(page);
  await expectNoA11yViolations(page);
  await page.getByRole("link", { name: "Forms Inbox", exact: true }).click();
  await expectNoA11yViolations(page);
});

test("calendar dialog is keyboard operable and restores focus", async ({ page }) => {
  await unlockDemoAdmin(page, "demo-review");
  await page.evaluate(() => {
    window.location.hash = "/calendar?previewTheme=public-grid";
  });
  const eventDay = page.locator(".cal-cell.has-events").filter({ has: page.locator("span") }).first();
  await eventDay.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(eventDay).toBeFocused();
});

test("field errors are associated with their controls", async ({ page }) => {
  await page.goto("/#/contact");
  await page.getByRole("button", { name: "Send message" }).click();
  const email = page.getByLabel("Email");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  const describedBy = await email.getAttribute("aria-describedby");
  expect(describedBy).toBeTruthy();
  await expect(page.locator(`#${describedBy}`)).toContainText("valid email");
});
