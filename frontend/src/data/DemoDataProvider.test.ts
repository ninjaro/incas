import { beforeEach, describe, expect, it } from "vitest";

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
    const submitted = await provider.submitKaraokeRequest({
      displayName: "Test Singer",
      songTitle: "Test Song",
    });
    expect(submitted.publicId).toMatch(/^KRQ-/);

    const tracked = await provider.trackKaraokeRequest(submitted.publicId);
    expect(tracked.status).toBe("pending");
    expect(tracked.queuePosition).toBeNull();

    await provider.unlock("demo-karaoke");
    const admin = await provider.getAdminKaraoke("pending");
    const mine = admin.items.find((item) => item.publicId === submitted.publicId);
    expect(mine).toBeDefined();

    const approved = await provider.karaokeAction(mine!.id, "approve");
    expect(approved.status).toBe("approved");
    const trackedAfter = await provider.trackKaraokeRequest(submitted.publicId);
    expect(trackedAfter.queuePosition).toBeGreaterThan(0);
  });

  it("simulates payments deterministically", async () => {
    const checkout = await provider.startCheckout("international-breakfast");
    expect(checkout.status).toBe("pending");
    expect(checkout.isSimulated).toBe(true);

    const paid = await provider.simulatePayment(checkout.publicId, "success");
    expect(paid.status).toBe("paid");
  });

  it("refuses checkout for free events", async () => {
    await expect(provider.startCheckout("karaoke-night")).rejects.toMatchObject({
      code: "payment_not_required",
    });
  });
});
