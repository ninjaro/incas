import { expect, test, type Page } from "@playwright/test";

import { freezeTime, unlockDemoAdmin } from "./helpers";

async function go(page: Page, route: string, ready = ".shell-main") {
  await page.evaluate((nextRoute) => {
    window.location.hash = nextRoute;
  }, route);
  await page.locator(ready).waitFor();
  await page.evaluate(() => document.fonts.ready);
}

async function snapshot(page: Page, name: string) {
  await expect(page.locator(".shell-main")).toHaveScreenshot(name, {
    mask: [page.locator(".event-map-canvas")],
    maskColor: "#f4e7dc",
  });
}

test.beforeEach(async ({ page }) => {
  await freezeTime(page);
});

test("public and admin visual regression matrix", async ({ page }) => {
  await unlockDemoAdmin(page);

  for (const theme of ["hero", "editorial", "event-first", "portal"]) {
    await go(page, `/?previewTheme=${theme}`);
    await snapshot(page, `landing-${theme}.png`);
  }

  await page.getByRole("button", { name: "Toggle light or dark appearance" }).click();
  await snapshot(page, "landing-portal-dark.png");
  await page.getByRole("button", { name: "Toggle light or dark appearance" }).click();

  await go(page, "/offers");
  await snapshot(page, "offers.png");
  await go(page, "/about");
  await snapshot(page, "about-team.png");

  for (const theme of ["month", "public-grid", "agenda", "timeline", "board", "cards", "table"]) {
    await go(page, `/calendar?previewTheme=${theme}`);
    await snapshot(page, `calendar-${theme}.png`);
  }

  await go(page, "/calendar");
  await page.locator(".cal-chip").filter({ hasText: "International Weekend" }).first().click();
  await page.locator(".event-detail").waitFor();
  await snapshot(page, "event-paid-trip.png");

  await go(page, "/calendar");
  await page.getByRole("button", { name: "Next" }).click();
  await page.locator(".cal-chip").filter({ hasText: "Opening Ceremony" }).click();
  await snapshot(page, "event-free-opening.png");

  await go(page, "/admin");
  await snapshot(page, "admin-dashboard.png");
  for (const route of ["posts", "registrations", "forms", "tandem", "themes"]) {
    await go(page, `/admin/${route}`);
    await snapshot(page, `admin-${route}.png`);
  }
});

test("@mobile mobile navigation visual regression", async ({ page }) => {
  await page.goto("/");
  await page.locator(".site-nav-menu-toggle").click();
  await expect(page).toHaveScreenshot("mobile-navigation.png");
});
