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
  test.slow();
  await unlockDemoAdmin(page);

  for (const theme of ["hero", "editorial", "event-first", "portal"]) {
    await go(page, `/?previewTheme=${theme}`);
    await snapshot(page, `landing-${theme}.png`);
  }

  await page.getByRole("button", { name: "Toggle light or dark appearance" }).click();
  await snapshot(page, "landing-portal-dark.png");
  await page.getByRole("button", { name: "Toggle light or dark appearance" }).click();

  await go(page, "/offers");
  await expect(page.locator(".offers-grid .offers-card")).toHaveCount(9);
  const firstCard = page.locator(".offers-card").first();
  const secondCard = page.locator(".offers-card").nth(1);
  expect((await firstCard.boundingBox())?.y).toBe((await secondCard.boundingBox())?.y);
  await snapshot(page, "offers.png");
  await go(page, "/about");
  await expect(page.locator(".about-topic-preview .section-card")).toHaveCount(3);
  await snapshot(page, "about-overview.png");
  await go(page, "/about/team?previewTheme=grid");
  await expect(page.locator(".team-grid")).toBeVisible();
  await snapshot(page, "team-grid.png");
  await go(page, "/about/team?previewTheme=spotlight");
  await expect(page.locator(".team-spotlight-row").first()).toBeVisible();
  await snapshot(page, "team-spotlight.png");
  await go(page, "/offers/international-weekend");
  await expect(page.locator(".section-pager")).toBeVisible();
  await snapshot(page, "offer-detail.png");
  await go(page, "/contact");
  await expect(page.locator(".contact-options a")).toHaveCount(3);
  await snapshot(page, "contact-hub.png");

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

test("desktop About disclosure visual regression", async ({ page }) => {
  await page.goto("/#/about");
  const disclosure = page.locator(".site-nav-group-disclosure");
  await disclosure.click();
  await expect(disclosure).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator('.site-nav-links [aria-current="page"]')).toHaveCount(1);
  await expect(page).toHaveScreenshot("about-submenu-desktop.png");
});

test("@mobile public sections remain responsive at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/#/about");
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 320);
  await expect(page.locator(".content-page-image")).toBeVisible();
  await expect(page).toHaveScreenshot("about-overview-320.png", { fullPage: true });

  await page.goto("/#/offers");
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 320);
  await expect(page.locator(".offers-card").first()).toBeVisible();
  await expect(page).toHaveScreenshot("offers-320.png", { fullPage: true });

  await page.locator(".site-nav-menu-toggle").click();
  await page.getByRole("button", { name: "Open submenu: About Us" }).click();
  await expect(page.getByRole("button", { name: "Close submenu: About Us" })).toHaveAttribute("aria-expanded", "true");
  await expect(page).toHaveScreenshot("about-submenu-mobile.png");
});
