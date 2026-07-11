# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.ts >> field errors are associated with their controls
- Location: e2e/accessibility.spec.ts:50:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByLabel('Email')
Expected: "true"
Received: "false"
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for getByLabel('Email')
    14 × locator resolved to <input value="" id="_r_2_" type="email" autocomplete="email" aria-invalid="false"/>
       - unexpected value "false"

```

```yaml
- textbox "Email"
```

# Test source

```ts
  1  | import AxeBuilder from "@axe-core/playwright";
  2  | import { expect, test, type Page } from "@playwright/test";
  3  | 
  4  | import { freezeTime, unlockDemoAdmin } from "./helpers";
  5  | 
  6  | async function expectNoA11yViolations(page: Page) {
  7  |   const result = await new AxeBuilder({ page })
  8  |     .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
  9  |     .analyze();
  10 |   expect(
  11 |     result.violations.map((violation) => ({
  12 |       id: violation.id,
  13 |       impact: violation.impact,
  14 |       targets: violation.nodes.map((node) => node.target.join(" ")),
  15 |     })),
  16 |   ).toEqual([]);
  17 | }
  18 | 
  19 | test.beforeEach(async ({ page }) => {
  20 |   await freezeTime(page);
  21 | });
  22 | 
  23 | test("primary public and admin surfaces pass automated WCAG checks", async ({ page }) => {
  24 |   for (const route of ["/", "/#/offers", "/#/calendar", "/#/contact"]) {
  25 |     await page.goto(route);
  26 |     await page.locator(".shell-main").waitFor();
  27 |     await expectNoA11yViolations(page);
  28 |   }
  29 | 
  30 |   await unlockDemoAdmin(page);
  31 |   await expectNoA11yViolations(page);
  32 |   await page.getByRole("link", { name: "Forms Inbox", exact: true }).click();
  33 |   await expectNoA11yViolations(page);
  34 | });
  35 | 
  36 | test("calendar dialog is keyboard operable and restores focus", async ({ page }) => {
  37 |   await unlockDemoAdmin(page, "demo-review");
  38 |   await page.evaluate(() => {
  39 |     window.location.hash = "/calendar?previewTheme=public-grid";
  40 |   });
  41 |   const eventDay = page.locator(".cal-cell.has-events").filter({ has: page.locator("span") }).first();
  42 |   await eventDay.focus();
  43 |   await page.keyboard.press("Enter");
  44 |   await expect(page.getByRole("dialog")).toBeVisible();
  45 |   await page.keyboard.press("Escape");
  46 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  47 |   await expect(eventDay).toBeFocused();
  48 | });
  49 | 
  50 | test("field errors are associated with their controls", async ({ page }) => {
  51 |   await page.goto("/#/contact");
  52 |   await page.getByRole("button", { name: "Send message" }).click();
  53 |   const email = page.getByLabel("Email");
> 54 |   await expect(email).toHaveAttribute("aria-invalid", "true");
     |                       ^ Error: expect(locator).toHaveAttribute(expected) failed
  55 |   const describedBy = await email.getAttribute("aria-describedby");
  56 |   expect(describedBy).toBeTruthy();
  57 |   await expect(page.locator(`#${describedBy}`)).toContainText("valid email");
  58 | });
  59 | 
```