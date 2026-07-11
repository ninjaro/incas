# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.ts >> primary public and admin surfaces pass automated WCAG checks
- Location: e2e/accessibility.spec.ts:23:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 9

- Array []
+ Array [
+   Object {
+     "id": "color-contrast",
+     "impact": "serious",
+     "targets": Array [
+       ".site-footer-copy",
+     ],
+   },
+ ]
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - note [ref=e4]:
    - strong [ref=e5]: Demo mode
    - text: — synthetic data, no real backend. Actions are simulated.
  - navigation "Main navigation" [ref=e6]:
    - generic [ref=e7]:
      - link "INCAS" [ref=e8] [cursor=pointer]:
        - /url: "#/"
        - img "INCAS" [ref=e9]
      - generic [ref=e10]:
        - generic [ref=e11]:
          - link "Home" [ref=e12] [cursor=pointer]:
            - /url: "#/"
          - link "Events" [ref=e13] [cursor=pointer]:
            - /url: "#/calendar"
          - button "About Us" [ref=e15] [cursor=pointer]
          - link "Offers" [ref=e16] [cursor=pointer]:
            - /url: "#/offers"
          - link "Language Tandem" [ref=e17] [cursor=pointer]:
            - /url: "#/tandem"
          - link "Contact" [ref=e18] [cursor=pointer]:
            - /url: "#/contact"
          - link "Admin" [ref=e19] [cursor=pointer]:
            - /url: "#/admin"
        - generic [ref=e20]:
          - group "Language" [ref=e21]:
            - button "EN" [pressed] [ref=e22] [cursor=pointer]
            - button "DE" [ref=e23] [cursor=pointer]
          - button "Toggle light or dark appearance" [ref=e24] [cursor=pointer]:
            - img [ref=e25]
  - main [ref=e27]:
    - generic [ref=e28]:
      - generic [ref=e29]:
        - paragraph [ref=e30]: Intercultural Centre of Aachen Students
        - heading "Bringing people together in Aachen" [level=1] [ref=e31]
        - paragraph [ref=e32]: Open events, language exchange and trips organized by students for students.
        - generic [ref=e33]:
          - link "Discover events" [ref=e34] [cursor=pointer]:
            - /url: "#/calendar"
          - link "About us" [ref=e35] [cursor=pointer]:
            - /url: "#/about"
      - link "Scroll" [ref=e36] [cursor=pointer]:
        - /url: "#upcoming-title"
        - text: Scroll
        - generic [ref=e37]: v
    - region "Upcoming events" [ref=e38]:
      - generic [ref=e39]:
        - generic [ref=e40]:
          - paragraph [ref=e41]: What's next
          - heading "Upcoming events" [level=2] [ref=e42]
        - link "View calendar" [ref=e43] [cursor=pointer]:
          - /url: "#/calendar"
      - generic [ref=e44]:
        - article [ref=e45]:
          - generic [ref=e46]:
            - link "Café Lingua" [ref=e49] [cursor=pointer]:
              - /url: "#/events/cafe-lingua-2026-07-14"
              - heading "Café Lingua" [level=3] [ref=e50]
            - time [ref=e51]: Tue, Jul 14, 2026, 08:00 PM - 12:00 AM
            - paragraph [ref=e52]: Relaxed language tables and conversation rounds.
            - generic [ref=e54]: Pinned
        - article [ref=e55]:
          - generic [ref=e56]:
            - 'link "International Weekend: Bonn, Germany" [ref=e59] [cursor=pointer]':
              - /url: "#/events/international-weekend-2026-07-18"
              - 'heading "International Weekend: Bonn, Germany" [level=3] [ref=e60]'
            - time [ref=e61]: Sat, Jul 18, 2026, 09:00 AM - 07:00 PM
            - paragraph [ref=e62]: Museum Mile options and a long walk by the Rhine.
            - generic [ref=e64]: 58 of 88 places available
            - strong [ref=e66]: "Price: €27.00"
        - article [ref=e67]:
          - generic [ref=e68]:
            - 'link "Country Evening: Turkey" [ref=e71] [cursor=pointer]':
              - /url: "#/events/country-evening-turkey-2026-07-21"
              - 'heading "Country Evening: Turkey" [level=3] [ref=e72]':
                - generic [ref=e73]: "Country Evening:"
                - strong [ref=e74]: Turkey
            - time [ref=e75]: Tue, Jul 21, 2026, 08:00 PM - 12:00 AM
            - paragraph [ref=e76]: Tea, food traditions and city life from different regions.
        - article [ref=e77]:
          - generic [ref=e78]:
            - link "Board Games" [ref=e81] [cursor=pointer]:
              - /url: "#/events/board-game-night-2026-07-28"
              - heading "Board Games" [level=3] [ref=e82]
            - time [ref=e83]: Tue, Jul 28, 2026, 08:00 PM - 12:00 AM
            - paragraph [ref=e84]: Easy-to-join games, mixed tables and snacks from 20:00 until around midnight.
        - article [ref=e85]:
          - generic [ref=e86]:
            - 'link "International Breakfast: Belgium" [ref=e89] [cursor=pointer]':
              - /url: "#/events/international-breakfast-2026-08-01"
              - 'heading "International Breakfast: Belgium" [level=3] [ref=e90]':
                - generic [ref=e91]: "International Breakfast:"
                - strong [ref=e92]: Belgium
            - time [ref=e93]: Sat, Aug 1, 2026, 10:00 AM - 01:00 PM
            - paragraph [ref=e94]: Homemade waffles, toppings and coffee refills.
            - generic [ref=e96]: 28 of 40 places available
            - generic [ref=e97]:
              - strong [ref=e98]: "Refundable deposit: €2.00"
              - generic [ref=e99]: The EUR 2 deposit is returned after participation.
        - article [ref=e100]:
          - generic [ref=e101]:
            - link "INCAS Opening Ceremony" [ref=e104] [cursor=pointer]:
              - /url: "#/events/incas-opening-ceremony-2026-08-04"
              - heading "INCAS Opening Ceremony" [level=3] [ref=e105]
            - time [ref=e106]: Tue, Aug 4, 2026, 06:00 PM - 09:00 PM
            - paragraph [ref=e107]: Meet the INCAS teams, discover the semester programme and stay for an open welcome reception.
            - generic [ref=e109]: 96 of 120 places available
    - generic [ref=e110]:
      - heading "Latest posts" [level=2] [ref=e112]
      - article [ref=e114]:
        - heading "Welcome to INCAS" [level=3] [ref=e115]:
          - link "Welcome to INCAS" [ref=e116] [cursor=pointer]:
            - /url: "#/events/welcome-to-incas"
        - paragraph [ref=e117]: Who we are and what we do for international students in Aachen.
        - link "Read more" [ref=e118] [cursor=pointer]:
          - /url: "#/events/welcome-to-incas"
    - generic [ref=e119]:
      - generic [ref=e120]:
        - paragraph [ref=e121]: INCAS Aachen
        - heading "International and local, together" [level=2] [ref=e122]
        - paragraph [ref=e123]: INCAS is a student initiative in Aachen. Volunteer teams organize meetups, language exchange, cultural events and trips.
        - link "About INCAS" [ref=e124] [cursor=pointer]:
          - /url: "#/about"
      - generic [ref=e125]:
        - link "International Tuesday Meet students from around the world on selected Tuesday evenings at Humboldt-Haus." [ref=e126] [cursor=pointer]:
          - /url: "#/offers/international-tuesday"
          - img [ref=e128]
          - generic [ref=e132]:
            - strong [ref=e133]: International Tuesday
            - generic [ref=e134]: Meet students from around the world on selected Tuesday evenings at Humboldt-Haus.
        - link "Country Evening Discover a country through stories, food, music and conversation." [ref=e135] [cursor=pointer]:
          - /url: "#/offers/country-evening"
          - img [ref=e137]
          - generic [ref=e140]:
            - strong [ref=e141]: Country Evening
            - generic [ref=e142]: Discover a country through stories, food, music and conversation.
        - link "Café Lingua Practice languages at relaxed conversation tables without prior registration." [ref=e143] [cursor=pointer]:
          - /url: "#/offers/cafe-lingua"
          - img [ref=e145]
          - generic [ref=e147]:
            - strong [ref=e148]: Café Lingua
            - generic [ref=e149]: Practice languages at relaxed conversation tables without prior registration.
        - link "International Breakfast Share a Saturday buffet inspired by a country or clearly defined culture." [ref=e150] [cursor=pointer]:
          - /url: "#/offers/international-breakfast"
          - img [ref=e152]
          - generic [ref=e154]:
            - strong [ref=e155]: International Breakfast
            - generic [ref=e156]: Share a Saturday buffet inspired by a country or clearly defined culture.
        - link "International Weekend Explore a nearby city or sight on a guided Saturday day trip." [ref=e157] [cursor=pointer]:
          - /url: "#/offers/international-weekend"
          - img [ref=e159]
          - generic [ref=e161]:
            - strong [ref=e162]: International Weekend
            - generic [ref=e163]: Explore a nearby city or sight on a guided Saturday day trip.
        - link "INCAS Active Join social, outdoor and team activities in and around Aachen." [ref=e164] [cursor=pointer]:
          - /url: "#/offers/incas-active"
          - img [ref=e166]
          - generic [ref=e168]:
            - strong [ref=e169]: INCAS Active
            - generic [ref=e170]: Join social, outdoor and team activities in and around Aachen.
        - link "Board Game Nights Bring a game or choose one from INCAS for an easy social evening." [ref=e171] [cursor=pointer]:
          - /url: "#/offers/board-game-nights"
          - img [ref=e173]
          - generic [ref=e176]:
            - strong [ref=e177]: Board Game Nights
            - generic [ref=e178]: Bring a game or choose one from INCAS for an easy social evening.
        - link "Dance Workshops Learn beginner-friendly dance steps and stay to practise together." [ref=e179] [cursor=pointer]:
          - /url: "#/offers/dance-workshops"
          - img [ref=e181]
          - generic [ref=e185]:
            - strong [ref=e186]: Dance Workshops
            - generic [ref=e187]: Learn beginner-friendly dance steps and stay to practise together.
    - button "Show past events" [ref=e189] [cursor=pointer]
  - contentinfo [ref=e190]:
    - generic [ref=e191]:
      - paragraph [ref=e192]: INCAS — Intercultural Centre of Aachen Students
      - generic "Social media" [ref=e193]:
        - link "facebook" [ref=e194] [cursor=pointer]:
          - /url: https://www.facebook.com/INCASAachen/
          - img [ref=e195]
          - generic [ref=e197]: facebook
        - link "instagram" [ref=e198] [cursor=pointer]:
          - /url: https://www.instagram.com/incas_aachen/
          - img [ref=e199]
          - generic [ref=e202]: instagram
      - list [ref=e203]:
        - listitem [ref=e204]:
          - link "International Tuesday" [ref=e205] [cursor=pointer]:
            - /url: "#/offers/international-tuesday"
        - listitem [ref=e206]:
          - link "International Breakfast" [ref=e207] [cursor=pointer]:
            - /url: "#/offers/international-breakfast"
        - listitem [ref=e208]:
          - link "Language Tandem" [ref=e209] [cursor=pointer]:
            - /url: "#/offers/language-tandem"
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
> 16 |   ).toEqual([]);
     |     ^ Error: expect(received).toEqual(expected) // deep equality
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
  54 |   await expect(email).toHaveAttribute("aria-invalid", "true");
  55 |   const describedBy = await email.getAttribute("aria-describedby");
  56 |   expect(describedBy).toBeTruthy();
  57 |   await expect(page.locator(`#${describedBy}`)).toContainText("valid email");
  58 | });
  59 | 
```