import { expect, test } from "@playwright/test";

import { freezeTime, unlockDemoAdmin } from "./helpers";

test.beforeEach(async ({ page }) => {
  await freezeTime(page);
});

test("landing, calendar, event detail, locale, and appearance remain in the SPA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("img", { name: "INCAS" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Bringing people together");

  await page.getByRole("link", { name: "View calendar" }).click();
  await expect(page).toHaveURL(/#\/calendar/);
  await expect(page.locator(".cal-cell")).toHaveCount(42);
  await page.locator(".cal-chip").first().click();
  await expect(page).toHaveURL(/#\/events\//);
  await expect(page.locator(".event-detail")).toBeVisible();

  await page.getByRole("button", { name: "DE" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.getByRole("link", { name: "Zurück zum Kalender" })).toBeVisible();
  await page.getByRole("button", { name: "Helles oder dunkles Design umschalten" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("About navigation, route focus, and section boundaries are canonical", async ({ page }) => {
  await page.goto("/#/about/team");
  const disclosure = page.locator(".site-nav-group-disclosure");
  await disclosure.click();
  await expect(disclosure).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator('.site-nav-links [aria-current="page"]')).toHaveCount(1);
  await expect(page.locator('.site-nav-links [aria-current="page"]')).toHaveText("Team");
  await page.keyboard.press("Escape");
  await expect(disclosure).toBeFocused();
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");

  await page.getByRole("link", { name: "About Us", exact: true }).click();
  await expect(page).toHaveURL(/#\/about$/);
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page.locator(".about-topic-preview .section-card")).toHaveCount(3);

  const workingGroupsCardLink = page
    .locator(".about-topic-preview .section-card")
    .filter({ has: page.getByRole("heading", { name: "Working Groups" }) })
    .getByRole("link", { name: "Working Groups" });
  await workingGroupsCardLink.scrollIntoViewIfNeeded();
  const savedScrollPosition = await page.evaluate(() => window.scrollY);
  expect(savedScrollPosition).toBeGreaterThan(400);
  await workingGroupsCardLink.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.goBack();
  await expect(page).toHaveURL(/#\/about$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(savedScrollPosition - 50);

  await page.goto("/#/team");
  await expect(page).toHaveURL(/#\/about\/team$/);
  await unlockDemoAdmin(page, "demo-review");
  await page.goto("/#/about/team?previewTheme=spotlight");
  await expect(page.locator(".team-spotlight-row").first()).toBeVisible();

  for (const [route, title] of [
    ["/about", "About us"],
    ["/about/working-groups", "Working Groups"],
    ["/about/team-meetings", "Team Meetings"],
    ["/about/team", "The INCAS Team"],
    ["/offers/language-tandem", "Language Tandem"],
    ["/offers/international-tuesday", "International Tuesday"],
    ["/offers/country-evening", "Country Evening"],
    ["/offers/cafe-lingua", "Café Lingua"],
    ["/offers/international-breakfast", "International Breakfast"],
    ["/offers/international-weekend", "International Weekend"],
    ["/offers/incas-active", "INCAS Active"],
    ["/offers/board-game-nights", "Board Game Nights"],
    ["/offers/dance-workshops", "Dance Workshops"],
  ]) {
    await page.goto(`/#${route}`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  }

  for (const route of ["/offers/about", "/offers/working-groups", "/about/international-weekend", "/offers/offers"]) {
    await page.goto(`/#${route}`);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  }

  await page.goto("/");
  await page.getByRole("link", { name: "Skip to content" }).focus();
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("event details and registration remain usable when map rendering fails", async ({ page }) => {
  await page.addInitScript(() => {
    (window as Window & { __INCAS_FORCE_EVENT_MAP_FAILURE__?: boolean })
      .__INCAS_FORCE_EVENT_MAP_FAILURE__ = true;
  });
  await page.goto("/#/calendar");
  await page.locator(".cal-chip").filter({ hasText: "International Weekend" }).first().click();
  await expect(page.getByText("The map is currently unavailable.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit registration" })).toBeVisible();
  await expect(page.getByText(/Price:/).first()).toBeVisible();
});

test("bundled OpenLayers and amCharts event maps render", async ({ page }) => {
  await page.goto("/#/calendar");
  await page.locator(".cal-chip").filter({ hasText: "Country Evening" }).first().click();
  await expect(page.locator(".event-map-canvas canvas.am5-layer-0")).toBeVisible();
  await expect(page.locator(".event-map-fallback")).toHaveCount(0);

  await page.goto("/#/calendar");
  await page.locator(".cal-chip").filter({ hasText: "International Weekend" }).first().click();
  await expect(page.locator(".event-map-canvas .ol-viewport")).toBeVisible();
  await expect(page.locator(".event-map-canvas .ol-attribution")).toBeVisible();
  await expect(page.locator(".event-map-fallback")).toHaveCount(0);
});

test("contact and event suggestion forms submit natively in React", async ({ page }) => {
  await page.goto("/#/contact");
  await page.getByRole("link", { name: /General message/ }).click();
  await page.getByLabel("Name").fill("Demo Visitor");
  await page.getByLabel("Email").fill("visitor@example.org");
  await page.getByLabel("Message").fill("A browser-level contact test.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toContainText("CON-");

  await page.goto("/#/suggest-event");
  await page.getByLabel("Country or culture").fill("Poland");
  await page.getByLabel("Contact name").fill("Demo Visitor");
  await page.getByLabel("Email").fill("visitor@example.org");
  await page.getByRole("button", { name: "Submit suggestion" }).click();
  await expect(page.getByRole("status")).toContainText("SUG-");
});

test("paid registration is linked to payment and ends confirmed", async ({ page }) => {
  await page.goto("/#/calendar");
  await page.locator(".cal-chip").filter({ hasText: "International Weekend" }).first().click();
  await expect(page.getByText(/Price:/).first()).toBeVisible();
  await page.getByLabel("First name").fill("Paid");
  await page.getByLabel("Last name").fill("Participant");
  await page.getByLabel("Email").fill("paid@example.org");
  await page.getByLabel("Occupation").fill("Student");
  await page.getByRole("button", { name: "Submit registration" }).click();
  await expect(page).toHaveURL(/#\/registrations\/APP-DEMO/);
  await expect(page.getByText("Waiting for payment")).toBeVisible();
  await page.getByRole("button", { name: "Start payment" }).click();
  await page.getByRole("button", { name: "Simulate success" }).click();
  await expect(page.getByText("Approved")).toBeVisible();
});

test("landing Scroll stays in the HashRouter route and reaches Upcoming Events", async ({ page }) => {
  await page.goto("/");
  const originalUrl = page.url();
  await page.getByRole("button", { name: "Scroll" }).click();
  await expect(page).toHaveURL(originalUrl);
  await expect.poll(async () => {
    const box = await page.getByRole("heading", { name: "Upcoming events" }).boundingBox();
    return box ? box.y >= 0 && box.y < 260 : false;
  }).toBe(true);
});

test("access-key activation cleans the URL after body-based unlock", async ({ page }) => {
  await page.goto("/#/admin?accessKey=demo-review");
  await expect(page).toHaveURL(/#\/admin$/);
  await expect(page.getByRole("link", { name: "Themes", exact: true }))
    .not.toHaveAttribute("aria-disabled", "true");
  expect(page.url()).not.toContain("demo-review");
});

test("public cards expose one descriptive primary link", async ({ page }) => {
  await page.goto("/#/offers");
  const offerCards = page.locator(".offers-card");
  await expect(offerCards).toHaveCount(9);
  for (let index = 0; index < await offerCards.count(); index += 1) {
    const card = offerCards.nth(index);
    await expect(card.locator(".card-primary-link")).toHaveCount(1);
    await expect(card.getByRole("link").first()).not.toHaveText(/Read more|Learn more/i);
  }

  await page.goto("/#/about");
  for (const card of await page.locator(".about-topic-preview .section-card").all()) {
    await expect(card.getByRole("link")).toHaveCount(1);
    await expect(card.getByRole("link")).toHaveAccessibleName(/.+/);
  }

  await page.goto("/");
  for (const card of await page.locator(".event-card").all()) {
    await expect(card.getByRole("link")).toHaveCount(1);
    await expect(card.getByRole("link")).toHaveAccessibleName(/.+/);
  }
});

test("free registration confirms without checkout", async ({ page }) => {
  await page.goto("/#/calendar");
  await page.getByRole("button", { name: "Next" }).click();
  await page.locator(".cal-chip").filter({ hasText: "Opening Ceremony" }).click();
  await page.getByLabel("First name").fill("Free");
  await page.getByLabel("Last name").fill("Participant");
  await page.getByLabel("Email").fill("free@example.org");
  await page.getByLabel("Occupation").fill("Student");
  await page.getByRole("button", { name: "Submit registration" }).click();
  await expect(page.getByText("Approved")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start payment" })).toHaveCount(0);
});

test("karaoke request is scoped to its event and remains trackable", async ({ page }) => {
  await page.goto("/#/calendar");
  let karaoke = page.locator('.cal-chip[href*="karaoke-night"]');
  for (let month = 0; month < 4 && (await karaoke.count()) === 0; month += 1) {
    await page.getByRole("button", { name: "Next" }).click();
    karaoke = page.locator('.cal-chip[href*="karaoke-night"]');
  }
  await karaoke.first().click();
  await page.getByLabel("Your name or nickname").fill("Browser Singer");
  await page.getByLabel("Song title").fill("Browser Song");
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByText("Request received!")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your requests" })).toBeVisible();
  await expect(page.getByText("Browser Song")).toBeVisible();
});

test("capabilities unlock without logout and enable theme preview/voting", async ({ page }) => {
  await unlockDemoAdmin(page, "demo-review");
  await page.getByRole("link", { name: "Themes", exact: true }).click();
  const calendar = page.getByRole("region", { name: "Calendar" });
  const publicGrid = calendar.locator(".theme-option").filter({ hasText: "Public Month Grid" });
  await publicGrid.getByRole("button", { name: "Vote" }).click();
  await expect(publicGrid.getByRole("button", { name: "Voted" })).toBeVisible();
  await publicGrid.getByRole("link", { name: "Preview" }).click();
  await expect(page.locator(".cal-grid.is-public-grid")).toBeVisible();
});

test("@mobile mobile menu overlays content and closes after navigation", async ({ page }) => {
  await page.goto("/");
  const toggle = page.locator(".site-nav-menu-toggle");
  await expect(toggle).toHaveAccessibleName("Open menu");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(toggle).toHaveAccessibleName("Close menu");
  await page.getByRole("link", { name: "Events", exact: true }).click();
  await expect(page).toHaveURL(/#\/calendar/);
  await expect(page.locator(".site-nav-menu-toggle")).toHaveAttribute("aria-expanded", "false");
});
