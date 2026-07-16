import { beforeEach, describe, expect, it } from "vitest";

import type { Locale } from "../api/types";
import { DemoDataProvider } from "./DemoDataProvider";

describe("DemoDataProvider", () => {
  let provider: DemoDataProvider;

  beforeEach(() => {
    provider = new DemoDataProvider();
  });

  it("starts with no capabilities and rejects admin calls", async () => {
    const session = await provider.getSession();
    expect(session.capabilities).toEqual([]);
    await expect(provider.getAdminThemes()).rejects.toMatchObject({
      code: "capability_required",
      status: 403,
    });
  });

  it("unlocks demo keys and expands capabilities", async () => {
    const session = await provider.unlock("demo-review");
    expect(session.capabilities).toContain("theme_review");
    await expect(provider.getAdminThemes()).resolves.toMatchObject({ canForce: false });
  });

  it("rejects unknown keys", async () => {
    await expect(provider.unlock("wrong")).rejects.toMatchObject({ code: "key_invalid" });
  });

  it("revokes generated-key access when the key expires", async () => {
    await provider.unlock("demo-admin");
    const generated = await provider.createAccessKey({
      label: "Temporary forms",
      scopes: ["forms"],
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    const temporary = new DemoDataProvider();
    // Generated keys belong to their provider instance, like one backend.
    const localGenerated = await provider.unlock(generated.secret);
    expect(localGenerated.capabilities).toContain("forms");
    await provider.expireAccessKey(generated.id);
    await expect(provider.unlock(generated.secret)).rejects.toMatchObject({
      code: "key_invalid",
    });
    await expect(temporary.unlock(generated.secret)).rejects.toMatchObject({
      code: "key_invalid",
    });
  });

  it("replaces a previous theme vote instead of stacking votes", async () => {
    await provider.unlock("demo-admin");
    await provider.voteTheme("landing", "editorial");
    const second = await provider.voteTheme("landing", "hero");
    expect(second.votes).toMatchObject({ editorial: 0, hero: 1 });
  });

  it("enforces the 24 hour force lock per page", async () => {
    await provider.unlock("demo-admin");
    await provider.forceTheme("landing", "editorial");
    await expect(provider.forceTheme("landing", "hero")).rejects.toMatchObject({
      code: "theme_force_locked",
    });
    // Other pages are unaffected.
    await expect(provider.forceTheme("calendar", "agenda")).resolves.toMatchObject({
      publicTheme: "agenda",
    });
    const config = await provider.getPublicConfig();
    expect(config.themes.landing).toBe("editorial");
  });

  it("hides personal data in blind tandem mode and reveals it with the private key", async () => {
    await provider.unlock("demo-tandem-blind");
    const blind = await provider.getTandemRequests();
    expect(blind.capabilities.private).toBe(false);
    for (const item of blind.items) {
      expect(item.email).toBeUndefined();
      expect(item.firstName).toBeUndefined();
    }

    await provider.unlock("demo-admin");
    const full = await provider.getTandemRequests();
    expect(full.capabilities.private).toBe(true);
    expect(full.items[0].email).toBeTruthy();
  });

  it("runs the karaoke flow: submit, approve, queue position, reorder", async () => {
    const event = (await provider.getPublicPosts()).events.find((item) => item.eventKind === "karaoke");
    expect(event).toBeDefined();
    const submitted = await provider.submitKaraokeRequest({
      displayName: "Test Singer",
      songTitle: "Test Song",
      eventSlug: event!.slug,
    });
    expect(submitted.publicId).toMatch(/^KRQ-/);

    const tracked = await provider.trackKaraokeRequest(submitted.publicId);
    expect(tracked.status).toBe("pending");
    expect(tracked.queuePosition).toBeNull();
    const batch = await provider.trackKaraokeRequests([submitted.publicId, submitted.publicId, "missing"]);
    expect(batch.items.map((item) => item.publicId)).toEqual([submitted.publicId]);
    expect(batch.missing).toEqual(["missing"]);

    await provider.unlock("demo-karaoke");
    const admin = await provider.getAdminKaraoke("pending");
    const mine = admin.items.find((item) => item.publicId === submitted.publicId);
    expect(mine).toBeDefined();

    const approved = await provider.karaokeAction(mine!.id, "approve");
    expect(approved.status).toBe("approved");
    const trackedAfter = await provider.trackKaraokeRequest(submitted.publicId);
    expect(trackedAfter.queuePosition).toBeGreaterThan(0);
  });

  it("keeps karaoke positions and reordering scoped to one event", async () => {
    const events = (await provider.getPublicPosts()).events.filter((item) => item.eventKind === "karaoke");
    expect(events.length).toBeGreaterThanOrEqual(2);
    const first = await provider.submitKaraokeRequest({ displayName: "One", songTitle: "Song one", eventSlug: events[0].slug });
    const second = await provider.submitKaraokeRequest({ displayName: "Two", songTitle: "Song two", eventSlug: events[1].slug });
    await provider.unlock("demo-karaoke");
    const firstAdmin = (await provider.getAdminKaraoke("pending", events[0].slug)).items.find((item) => item.publicId === first.publicId)!;
    const secondAdmin = (await provider.getAdminKaraoke("pending", events[1].slug)).items.find((item) => item.publicId === second.publicId)!;
    await provider.karaokeAction(firstAdmin.id, "approve");
    await provider.karaokeAction(secondAdmin.id, "approve");
    expect((await provider.trackKaraokeRequest(first.publicId)).queuePosition).toBeGreaterThan(0);
    expect((await provider.trackKaraokeRequest(second.publicId)).queuePosition).toBe(1);
    await expect(provider.reorderKaraoke([firstAdmin.id, secondAdmin.id])).rejects.toMatchObject({
      code: "queue_conflict",
    });
  });

  it("simulates payments deterministically", async () => {
    const paidEvent = (await provider.getPublicPosts()).events.find((event) => event.registration?.priceCents);
    expect(paidEvent).toBeDefined();
    const registration = await provider.registerForEvent(paidEvent!.slug, {
      firstName: "Demo", lastName: "Visitor", email: "demo.visitor@example.com",
      occupation: "Student at RWTH Aachen", dietPreference: paidEvent!.eventKind === "breakfast" ? "vegetarian" : "", comment: "",
    });
    const checkout = await provider.startCheckout(paidEvent!.slug, registration.publicId);
    expect(checkout.status).toBe("pending");
    expect(checkout.isSimulated).toBe(true);
    const resumed = await provider.startCheckout(paidEvent!.slug, registration.publicId);
    expect(resumed.publicId).toBe(checkout.publicId);

    const paid = await provider.simulatePayment(checkout.publicId, "success");
    expect(paid.status).toBe("paid");
    await expect(provider.simulatePayment(checkout.publicId, "success")).rejects.toMatchObject({
      code: "payment_finalized",
    });
  });

  it("persists tandem duplicate decisions and removes merged records", async () => {
    await provider.unlock("demo-admin");
    const initial = await provider.getTandemDuplicates();
    const duplicate = initial.items.find((item) =>
      [item.left.ref, item.right.ref].includes("demo-ref-aaaa")
      && [item.left.ref, item.right.ref].includes("demo-ref-aaab"));
    expect(duplicate).toBeDefined();

    await provider.decideTandemDuplicate(
      duplicate!.left.ref,
      duplicate!.right.ref,
      "different",
      "Checked in demo",
    );
    const decided = await provider.getTandemDuplicates();
    expect(decided.items.find((item) => item.left.ref === duplicate!.left.ref)?.decision).toBe("different");

    await provider.reviewTandemMatch("demo-ref-aaab", "demo-ref-bbbb", "shortlist");
    await provider.mergeTandemDuplicate("demo-ref-aaaa", "demo-ref-aaab");
    const requests = await provider.getTandemRequests();
    expect(requests.items.some((item) => item.ref === "demo-ref-aaab")).toBe(false);
    expect((await provider.getTandemDuplicates()).items).toHaveLength(0);
    const matches = await provider.getTandemMatches("demo-ref-aaaa");
    const moved = Object.values(matches.groups).flat().find((match) => match.candidate.ref === "demo-ref-bbbb");
    expect(moved?.review.shortlisted).toBe(true);
  });

  it("refuses checkout for free events", async () => {
    const freeEvent = (await provider.getPublicPosts()).events.find((event) => !event.registration?.priceCents);
    expect(freeEvent).toBeDefined();
    await expect(provider.startCheckout(freeEvent!.slug, "APP-NOT-USED")).rejects.toMatchObject({
      code: "payment_not_required",
    });
  });

  it("serves localized site chrome from the snapshot", async () => {
    const en = await provider.getSite("en");
    expect(en.strings["nav.home"]).toBe("Home");
    const de = await provider.getSite("de");
    expect(de.strings["nav.home"]).toBe("Start");
  });

  it("reports the locale actually served when falling back to en", async () => {
    // "fr" isn't in the snapshot, so getSite falls back to the "en" content;
    // the response must say `locale: "en"`, not echo back the request.
    const fallback = await provider.getSite("fr" as Locale);
    expect(fallback.locale).toBe("en");
    expect(fallback.strings["nav.home"]).toBe("Home");
  });

  it("serves content pages and rejects unknown slugs", async () => {
    const about = await provider.getContent("about", "en");
    expect(about.title).toBe("About us");
    expect(about.bodyHtml.length).toBeGreaterThan(0);
    await expect(provider.getContent("nope", "en")).rejects.toMatchObject({
      code: "not_found",
      status: 404,
    });
  });

  it("preserves explicit post field clears", async () => {
    await provider.unlock("demo-admin");
    const post = await provider.createPost({
      title: "Temporary event",
      eventKind: "trip",
      startsAt: "2026-07-11T09:00",
      endsAt: "2026-07-11T18:00",
      publishAt: "2026-07-10T09:00",
      status: "scheduled",
      isPinned: true,
      imageUrl: "/static/img/example.jpg",
      registrationLimitEnabled: true,
      registrationLimit: 40,
      registrationPriceCents: 200,
      registrationIsDeposit: true,
      summary: "Temporary summary",
    });

    const updated = await provider.updatePost(post.id, {
      eventKind: null,
      startsAt: null,
      endsAt: null,
      publishAt: null,
      status: "draft",
      isPinned: false,
      imageUrl: "",
      registrationLimitEnabled: false,
      registrationLimit: 0,
      registrationPriceCents: 0,
      registrationIsDeposit: false,
      summary: "",
    });
    expect(updated).toMatchObject({
      eventKind: null,
      startsAt: null,
      endsAt: null,
      publishAt: null,
      isPinned: false,
      imageUrl: "",
      registrationLimitEnabled: false,
      registrationLimit: 0,
      registrationPriceCents: 0,
      registrationIsDeposit: false,
      summary: "",
      isActive: false,
    });
  });

  it("keeps every historical demo slug resolving after repeated explicit changes", async () => {
    await provider.unlock("demo-admin");
    const event = (await provider.getPublicPosts()).events[0];
    const admin = (await provider.getAdminPosts()).items.find(
      (item) => item.slug === event.slug,
    );
    if (!admin) return;
    const original = admin.slug;
    await provider.updatePostSlug(admin.id, `${original}-renamed`);
    await provider.updatePostSlug(admin.id, `${original}-final`);
    expect((await provider.getPublicPost(original)).slug).toBe(`${original}-final`);
    expect((await provider.getPublicPost(`${original}-renamed`)).slug)
      .toBe(`${original}-final`);
  });
});
