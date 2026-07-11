import type {
  AdminPost,
  AdminSocialPublication,
  AdminPayment,
  AccessKeyInfo,
  CreatedAccessKey,
  Capability,
  ContactSubmission,
  ContentPageResponse,
  EventQueueSummary,
  EventRegistrationInput,
  EventRegistrationStatus,
  EventSuggestionSubmission,
  FormInboxEntry,
  FormOptions,
  KaraokeAction,
  KaraokeAdminEntry,
  KaraokeAuditEntry,
  KaraokeStatus,
  KaraokeSubmission,
  Locale,
  PageId,
  PaymentInfo,
  PostInput,
  PostTemplateInfo,
  PublicPost,
  RegistrationRecord,
  SessionInfo,
  SiteResponse,
  SocialPublication,
  TandemSubmission,
  TandemDuplicate,
  TandemMatch,
  TandemRequest,
  TandemReviewAction,
  ThemeAuditEntry,
} from "../api/types";
import siteSnapshot from "../content/site.generated.json";
import { PAGE_THEMES } from "../features/themes/registry";
import { ApiError } from "../api/client";
import type { DataProvider } from "./DataProvider";
import {
  DEMO_KEYS,
  buildDemoAdminPosts,
  buildDemoEvents,
  buildDemoKaraoke,
  demoPosts,
  demoTandemRequests,
  demoTemplates,
} from "./fixtures";

class DemoError extends ApiError {
  constructor(code: string, message: string, status = 400, details: Record<string, unknown> = {}) {
    super(status, { code, message, details });
  }
}

const CAPABILITY_LABELS: Record<string, string> = {
  posts: "Posts and Events",
  event_registrations: "Event Registrations",
  forms: "Forms Inbox",
  access_keys: "Access Keys",
  theme_review: "Theme Review and Voting",
  theme_force: "Theme Force",
  karaoke_queue: "Karaoke Queue",
  language_tandem_blind: "Tandem Matching (Blind)",
  language_tandem_private: "Tandem Contact Details",
  language_tandem_corrections: "Tandem Corrections",
};

const DEMO_PRIVATE_FIELDS: Record<string, { firstName: string; lastName: string; email: string }> = {
  "demo-ref-aaaa": { firstName: "Lucia", lastName: "Demo", email: "lucia@example.com" },
  "demo-ref-bbbb": { firstName: "Max", lastName: "Muster", email: "max@example.com" },
  "demo-ref-cccc": { firstName: "Giulia", lastName: "Esempio", email: "giulia@example.com" },
};

/**
 * In-memory backend for the static demo build. All state resets on reload;
 * writes behave deterministically so every flow can be demonstrated without
 * Python, a database, or credentials.
 */
export class DemoDataProvider implements DataProvider {
  readonly isDemo = true;

  private capabilities = new Set<Capability>();
  private events = buildDemoEvents();
  private adminPosts: AdminPost[] = buildDemoAdminPosts(buildDemoEvents());
  private templates: PostTemplateInfo[] = [...demoTemplates];
  private karaoke: KaraokeAdminEntry[] = buildDemoKaraoke().map((entry) => {
    const event = this.events.find((candidate) => candidate.eventKind === "karaoke" && candidate.isLive)
      ?? this.events.find((candidate) => candidate.eventKind === "karaoke");
    return { ...entry, postId: event ? this.events.indexOf(event) + 1 : null, eventSlug: event?.slug ?? null, eventTitle: event?.title.full ?? null };
  });
  private publicThemes: Record<string, string> = Object.fromEntries(
    Object.entries(PAGE_THEMES).map(([pageId, page]) => [pageId, page.defaultTheme]),
  );
  private votes: Record<string, Record<string, number>> = {};
  private myVotes: Record<string, string> = {};
  private lastForcedAt: Record<string, string> = {};
  private themeAudit: ThemeAuditEntry[] = [];
  private payments: PaymentInfo[] = [];
  private paymentRegistrations: Record<string, string> = {};
  private registrations: RegistrationRecord[] = [];
  private formInbox: FormInboxEntry[] = [];
  private accessKeys: AccessKeyInfo[] = [];
  private nextId = 1000;

  private require(capability: Capability) {
    if (!this.capabilities.has(capability)) {
      throw new DemoError(
        "capability_required",
        "This action requires an additional access key.",
        403,
        { capability },
      );
    }
  }

  private session(): SessionInfo {
    return {
      capabilities: [...this.capabilities].sort(),
      capabilityLabels: CAPABILITY_LABELS,
      sessionAuditId: "demo-session",
      hasAccessKeys: true,
    };
  }

  async getSession() {
    return this.session();
  }

  async unlock(key: string) {
    const scopes = DEMO_KEYS[key.trim()];
    if (!scopes) {
      throw new DemoError("key_invalid", "This access key is not valid.", 403);
    }
    scopes.forEach((scope) => this.capabilities.add(scope as Capability));
    if (this.capabilities.has("theme_force")) this.capabilities.add("theme_review");
    return { ...this.session(), newScopes: scopes };
  }

  async getPublicConfig() {
    return { themes: { ...this.publicThemes } };
  }

  async getPublicPosts() {
    return {
      events: this.events.filter((event) => event.isLive),
      posts: demoPosts,
      archivedEvents: this.events.filter((event) => !event.isLive),
    };
  }

  async getPublicPost(slug: string) {
    const post = [...this.events, ...demoPosts].find((entry) => entry.slug === slug);
    if (!post) throw new DemoError("not_found", "Post not found.", 404);
    return { ...post, bodyHtml: post.bodyHtml ?? `<p>${post.summary}</p>` };
  }

  async getCalendar(year: number, month: number) {
    const events = this.events.filter((event) => {
      if (!event.startsAt) return false;
      const date = new Date(event.startsAt);
      return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month;
    });
    return { year, month, events };
  }

  async getAdminThemes() {
    this.require("theme_review");
    const pages = Object.entries(PAGE_THEMES).map(([pageId, page]) => ({
      pageId: pageId as PageId,
      name: page.name,
      defaultTheme: page.defaultTheme,
      publicTheme: this.publicThemes[pageId],
      myVote: this.myVotes[pageId] ?? null,
      forceLock: this.forceLock(pageId),
      themes: Object.entries(page.themes).map(([themeId, theme]) => ({
        themeId,
        name: theme.name,
        description: theme.description,
        enabled: true,
        isDefault: themeId === page.defaultTheme,
        votes: this.votes[pageId]?.[themeId] ?? 0,
      })),
    }));
    return { pages, canForce: this.capabilities.has("theme_force") };
  }

  private forceLock(pageId: string) {
    const last = this.lastForcedAt[pageId];
    if (!last) return { isLocked: false, lockedUntil: null };
    const until = new Date(new Date(last).getTime() + 24 * 3600 * 1000);
    const isLocked = until.getTime() > Date.now();
    return {
      isLocked,
      lockedUntil: isLocked ? until.toISOString() : null,
      lastForcedAt: last,
    };
  }

  async voteTheme(page: PageId, theme: string) {
    this.require("theme_review");
    const previous = this.myVotes[page];
    const pageVotes = (this.votes[page] ??= {});
    if (previous) pageVotes[previous] = Math.max((pageVotes[previous] ?? 1) - 1, 0);
    pageVotes[theme] = (pageVotes[theme] ?? 0) + 1;
    this.myVotes[page] = theme;
    return { myVote: theme, votes: { ...pageVotes } };
  }

  async forceTheme(page: PageId, theme: string, note?: string) {
    this.require("theme_force");
    const lock = this.forceLock(page);
    if (lock.isLocked) {
      throw new DemoError("theme_force_locked", "This page theme cannot be changed yet.", 409, {
        availableAt: lock.lockedUntil,
      });
    }
    const now = new Date().toISOString();
    this.themeAudit.unshift({
      pageId: page,
      previousTheme: this.publicThemes[page],
      newTheme: theme,
      action: "force",
      actor: "demo-session",
      note: note ?? "",
      createdAt: now,
    });
    this.publicThemes[page] = theme;
    this.lastForcedAt[page] = now;
    return {
      publicTheme: theme,
      forcedAt: now,
      nextChangeAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    };
  }

  async getThemeAudit(page?: string) {
    this.require("theme_review");
    return {
      entries: page ? this.themeAudit.filter((entry) => entry.pageId === page) : this.themeAudit,
    };
  }

  async getAdminPosts(params?: { status?: string; page?: number }) {
    this.require("posts");
    const items = params?.status
      ? this.adminPosts.filter((post) => post.status === params.status)
      : this.adminPosts;
    return { items, page: 1, perPage: 50, total: items.length, pages: 1 };
  }

  async getAdminPost(id: number) {
    this.require("posts");
    const post = this.adminPosts.find((entry) => entry.id === id);
    if (!post) throw new DemoError("not_found", "Post not found.", 404);
    return post;
  }

  async createPost(input: PostInput) {
    this.require("posts");
    if (!input.title?.trim()) {
      throw new DemoError("validation_failed", "Some fields are invalid.", 422, {
        fields: { title: "Title is required." },
      });
    }
    const post: AdminPost = {
      id: this.nextId++,
      slug: input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title: input.title,
      summary: input.summary ?? "",
      body: input.body ?? "",
      eventKind: input.eventKind ?? null,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      durationMinutes: input.durationMinutes ?? null,
      publishAt: input.publishAt ?? null,
      status: input.status ?? "draft",
      storedStatus: input.status ?? "draft",
      isActive: input.status === "published",
      isPinned: Boolean(input.isPinned),
      imageUrl: input.imageUrl ?? "",
      registrationLimitEnabled: Boolean(input.registrationLimitEnabled),
      registrationLimit: input.registrationLimit ?? null,
      registrationPriceCents: input.registrationPriceCents ?? null,
      registrationIsDeposit: Boolean(input.registrationIsDeposit),
      registrationMode: input.registrationMode ?? "none",
      depositExplanation: input.depositExplanation ?? "",
      venue: input.venue ?? "",
      address: input.address ?? "",
      city: input.city ?? "",
      meetingPoint: input.meetingPoint ?? "",
      destination: input.destination ?? "",
      countryCode: input.countryCode ?? "",
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      destinationLatitude: input.destinationLatitude ?? null,
      destinationLongitude: input.destinationLongitude ?? null,
      mapConfig: input.mapConfig ?? {},
      featureFlags: input.featureFlags ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      social: [],
    };
    this.adminPosts.unshift(post);
    return post;
  }

  async updatePost(id: number, input: PostInput) {
    const post = await this.getAdminPost(id);
    Object.assign(post, {
      title: input.title ?? post.title,
      summary: input.summary ?? post.summary,
      body: input.body ?? post.body,
      eventKind: input.eventKind ?? post.eventKind,
      startsAt: input.startsAt ?? post.startsAt,
      endsAt: input.endsAt ?? post.endsAt,
      durationMinutes: input.durationMinutes ?? post.durationMinutes,
      publishAt: input.publishAt ?? post.publishAt,
      status: input.status ?? post.status,
      storedStatus: input.status ?? post.storedStatus,
      registrationMode: input.registrationMode ?? post.registrationMode,
      depositExplanation: input.depositExplanation ?? post.depositExplanation,
      venue: input.venue ?? post.venue,
      address: input.address ?? post.address,
      city: input.city ?? post.city,
      meetingPoint: input.meetingPoint ?? post.meetingPoint,
      destination: input.destination ?? post.destination,
      countryCode: input.countryCode ?? post.countryCode,
      latitude: input.latitude ?? post.latitude,
      longitude: input.longitude ?? post.longitude,
      destinationLatitude: input.destinationLatitude ?? post.destinationLatitude,
      destinationLongitude: input.destinationLongitude ?? post.destinationLongitude,
      mapConfig: input.mapConfig ?? post.mapConfig,
      featureFlags: input.featureFlags ?? post.featureFlags,
      updatedAt: new Date().toISOString(),
    });
    return post;
  }

  async getTemplates() {
    this.require("posts");
    return { items: this.templates };
  }

  async createTemplate(input: Partial<PostTemplateInfo>) {
    this.require("posts");
    const template: PostTemplateInfo = {
      id: this.nextId++,
      name: input.name ?? "Untitled template",
      titlePattern: input.titlePattern ?? "",
      summary: input.summary ?? "",
      body: input.body ?? "",
      eventKind: input.eventKind ?? null,
      registrationLimitEnabled: false,
      registrationLimit: null,
      registrationPriceCents: null,
      registrationIsDeposit: false,
      imageUrl: "",
      socialSettings: {},
      updatedAt: new Date().toISOString(),
    };
    this.templates.unshift(template);
    return template;
  }

  async updateTemplate(id: number, input: Partial<PostTemplateInfo>) {
    this.require("posts");
    const template = this.templates.find((entry) => entry.id === id);
    if (!template) throw new DemoError("not_found", "Template not found.", 404);
    Object.assign(template, input, { id, updatedAt: new Date().toISOString() });
    return template;
  }

  async deleteTemplate(id: number) {
    this.require("posts");
    this.templates = this.templates.filter((entry) => entry.id !== id);
  }

  async duplicateTemplate(id: number) {
    this.require("posts");
    const template = this.templates.find((entry) => entry.id === id);
    if (!template) throw new DemoError("not_found", "Template not found.", 404);
    const copy = { ...template, id: this.nextId++, name: `${template.name} (copy)` };
    this.templates.unshift(copy);
    return copy;
  }

  async createPostFromTemplate(templateId: number) {
    this.require("posts");
    const template = this.templates.find((entry) => entry.id === templateId);
    if (!template) throw new DemoError("not_found", "Template not found.", 404);
    return this.createPost({
      title: template.titlePattern || template.name,
      summary: template.summary,
      body: template.body,
      eventKind: template.eventKind ?? undefined,
      status: "draft",
    });
  }

  async publishSocial(postId: number, channels: string[]) {
    const post = await this.getAdminPost(postId);
    const results: SocialPublication[] = channels.map((provider, index) => ({
      id: postId * 10 + index,
      postId,
      provider,
      status: "published",
      providerPostId: `${provider === "facebook" ? "FB" : "IG"}-SIM-${postId}`,
      permalink: `https://${provider}.example.com/simulated/${post.slug}`,
      mediaUrl: "",
      errorCode: "",
      errorMessage: "",
      attemptCount: 1,
      isSimulated: true,
      scheduledFor: null,
      lastAttemptAt: new Date().toISOString(),
    }));
    post.social = results;
    return { results };
  }

  async retrySocial(publicationId: number) {
    this.require("posts");
    const post = this.adminPosts.find((entry) =>
      entry.social?.some((publication) => publication.id === publicationId),
    );
    if (!post) throw new DemoError("not_found", "Publication not found.", 404);
    return { results: post.social ?? [] };
  }

  async getAdminSocial(params?: { status?: string; provider?: string }): Promise<{ items: AdminSocialPublication[] }> {
    this.require("posts");
    const items = this.adminPosts.flatMap((post) => (post.social ?? []).map((publication) => ({ ...publication, postTitle: post.title, postSlug: post.slug }))).filter((publication) => (!params?.status || publication.status === params.status) && (!params?.provider || publication.provider === params.provider));
    return { items };
  }

  async getTandemRequests(params?: { q?: string; viewed?: string }) {
    this.require("language_tandem_blind");
    const showPrivate = this.capabilities.has("language_tandem_private");
    return {
      items: demoTandemRequests.filter((item) =>
        (!params?.viewed || params.viewed === "all" || item.isViewed === (params.viewed === "yes"))
        && (!params?.q || `${item.ref} ${DEMO_PRIVATE_FIELDS[item.ref]?.firstName ?? ""} ${DEMO_PRIVATE_FIELDS[item.ref]?.lastName ?? ""}`.toLowerCase().includes(params.q.toLowerCase())),
      ).map((item) =>
        showPrivate ? { ...item, ...DEMO_PRIVATE_FIELDS[item.ref], comment: "" } : item,
      ),
      capabilities: {
        private: showPrivate,
        corrections: this.capabilities.has("language_tandem_corrections"),
      },
    };
  }

  async getTandemMatches(ref: string) {
    const { items } = await this.getTandemRequests();
    const source = items.find((item) => item.ref === ref);
    if (!source) throw new DemoError("not_found", "Request not found.", 404);
    const candidates = items.filter((item) => item.ref !== ref);
    const matches = candidates
      .filter((candidate) =>
        source.requestedLanguages.some((lang) => candidate.offeredLanguages.includes(lang)),
      )
      .map((candidate) => ({
        candidate,
        category: (candidate.requestedLanguages.some((lang) =>
          source.offeredLanguages.includes(lang),
        )
          ? "full"
          : "partial") as "full" | "partial",
        score: 10,
        reasons: ["Offers a requested language (demo scoring)"],
        warnings: [],
        review: { hidden: false, shortlisted: false, contactedAt: null, finalPairAt: null },
      }));
    return {
      source,
      groups: {
        full: matches.filter((match) => match.category === "full"),
        partial: matches.filter((match) => match.category === "partial"),
        weak: [],
      },
      totals: { full: 0, partial: 0, weak: 0 },
    };
  }

  async updateTandem(ref: string, input: Record<string, unknown>) {
    this.require("language_tandem_corrections");
    const item = demoTandemRequests.find((entry) => entry.ref === ref);
    if (!item) throw new DemoError("not_found", "Request not found.", 404);
    Object.assign(item, input);
    return item;
  }

  async markTandemViewed(ref: string, isViewed: boolean) {
    this.require("language_tandem_blind");
    const item = demoTandemRequests.find((entry) => entry.ref === ref);
    if (!item) throw new DemoError("not_found", "Request not found.", 404);
    item.isViewed = isViewed;
    return { ref, isViewed };
  }

  async reviewTandemMatch(_sourceRef: string, _candidateRef: string, action: TandemReviewAction): Promise<TandemMatch["review"]> {
    this.require("language_tandem_blind");
    return {
      hidden: action === "hide",
      shortlisted: ["shortlist", "final_pair"].includes(action),
      contactedAt: action === "contacted" ? new Date().toISOString() : null,
      finalPairAt: action === "final_pair" ? new Date().toISOString() : null,
    };
  }

  async getTandemDuplicates(): Promise<{ items: TandemDuplicate[] }> {
    this.require("language_tandem_corrections");
    return { items: [] };
  }

  async decideTandemDuplicate(_leftRef: string, _rightRef: string, decision: "ignore" | "different", note = "") {
    this.require("language_tandem_corrections");
    return { decision, note };
  }

  async mergeTandemDuplicate(keepRef: string, _removeRef: string, _fields?: Record<string, string>): Promise<TandemRequest> {
    this.require("language_tandem_corrections");
    const item = demoTandemRequests.find((entry) => entry.ref === keepRef);
    if (!item) throw new DemoError("not_found", "Request not found.", 404);
    return item;
  }

  async submitKaraokeRequest(input: KaraokeSubmission) {
    if (!input.displayName?.trim() || !input.songTitle?.trim()) {
      throw new DemoError("validation_failed", "Some fields are invalid.", 422, {
        fields: {
          ...(input.displayName?.trim() ? {} : { displayName: "Enter a name or nickname." }),
          ...(input.songTitle?.trim() ? {} : { songTitle: "Enter a song title." }),
        },
      });
    }
    const entry: KaraokeAdminEntry = {
      id: this.nextId++,
      publicId: `KRQ-DEMO${this.nextId}`,
      postId: 1,
      displayName: input.displayName,
      songTitle: input.songTitle,
      artist: input.artist ?? "",
      note: input.note ?? "",
      contact: input.contact ?? "",
      status: "pending",
      position: null,
      queuePosition: null,
      eventSlug: input.eventSlug ?? null,
      eventTitle: input.eventSlug
        ? this.events.find((event) => event.slug === input.eventSlug)?.title.full ?? "Karaoke"
        : null,
      createdAt: new Date().toISOString(),
    };
    this.karaoke.push(entry);
    return { publicId: entry.publicId, status: entry.status };
  }

  async trackKaraokeRequest(publicId: string) {
    const entry = this.karaoke.find((item) => item.publicId === publicId);
    if (!entry) throw new DemoError("not_found", "Request not found.", 404);
    return this.publicEntry(entry);
  }

  private publicEntry(entry: KaraokeAdminEntry) {
    const queue = this.karaoke
      .filter((item) => item.status === "approved" || item.status === "performing")
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const queuePosition = queue.findIndex((item) => item.id === entry.id);
    return {
      publicId: entry.publicId,
      displayName: entry.displayName,
      songTitle: entry.songTitle,
      artist: entry.artist,
      status: entry.status,
      queuePosition: queuePosition >= 0 ? queuePosition + 1 : null,
      eventSlug: entry.eventSlug,
      eventTitle: entry.eventTitle,
    };
  }

  async getKaraokeQueue(eventSlug?: string) {
    const queue = this.karaoke
      .filter((item) =>
        (item.status === "approved" || item.status === "performing")
        && (!eventSlug || item.eventSlug === eventSlug),
      )
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    return { items: queue.map((entry) => this.publicEntry(entry)) };
  }

  async getAdminKaraoke(status?: string, eventSlug?: string) {
    this.require("karaoke_queue");
    const items = this.karaoke.filter((item) => (!status || item.status === status) && (!eventSlug || item.eventSlug === eventSlug));
    return {
      items: [...items].sort((a, b) => (a.position ?? 999) - (b.position ?? 999)),
      events: this.events.filter((event) => event.eventKind === "karaoke").map((event) => ({ slug: event.slug, title: event.title.full, startsAt: event.startsAt })),
    };
  }

  async karaokeAction(id: number, action: KaraokeAction) {
    this.require("karaoke_queue");
    const entry = this.karaoke.find((item) => item.id === id);
    if (!entry) throw new DemoError("not_found", "Request not found.", 404);

    const targets: Record<KaraokeAction, KaraokeStatus> = {
      approve: "approved",
      reject: "rejected",
      cancel: "cancelled",
      restore: "pending",
      performing: "performing",
      complete: "completed",
    };
    entry.status = targets[action];
    if (action === "approve") {
      const max = Math.max(0, ...this.karaoke.map((item) => item.position ?? 0));
      entry.position = max + 1;
    }
    if (["reject", "cancel", "restore", "complete"].includes(action)) {
      entry.position = null;
    }
    return { ...entry, queuePosition: this.publicEntry(entry).queuePosition };
  }

  async reorderKaraoke(order: number[]) {
    this.require("karaoke_queue");
    order.forEach((id, index) => {
      const entry = this.karaoke.find((item) => item.id === id);
      if (entry) entry.position = index + 1;
    });
    return this.getAdminKaraoke(undefined, this.karaoke.find((entry) => order.includes(entry.id))?.eventSlug ?? undefined);
  }

  async getKaraokeAudit() {
    this.require("karaoke_queue");
    return { entries: [] as KaraokeAuditEntry[] };
  }

  async startCheckout(postSlug: string, registrationPublicId: string) {
    const post = this.events.find((event) => event.slug === postSlug);
    if (!post?.registration?.priceCents) {
      throw new DemoError("payment_not_required", "This event does not require payment.", 422);
    }
    const registration = this.registrations.find(
      (entry) => entry.publicId === registrationPublicId && entry.event.slug === postSlug,
    );
    if (!registration || registration.status !== "waiting_payment") {
      throw new DemoError("registration_not_payable", "Create an eligible registration first.", 409);
    }
    const payment: PaymentInfo = {
      publicId: `PAY-DEMO-${this.nextId++}`,
      postId: null,
      amountCents: post.registration.priceCents,
      currency: "EUR",
      status: "pending",
      provider: "mock",
      isSimulated: true,
      errorMessage: "",
      checkoutUrl: "#/pay/simulated",
      simulated: true,
    };
    this.payments.push(payment);
    this.paymentRegistrations[payment.publicId] = registration.publicId;
    return payment;
  }

  async simulatePayment(publicId: string, outcome: "success" | "failure" | "cancel") {
    const payment = this.payments.find((entry) => entry.publicId === publicId);
    if (!payment) throw new DemoError("not_found", "Payment not found.", 404);
    payment.status =
      outcome === "success" ? "paid" : outcome === "failure" ? "failed" : "cancelled";
    if (outcome === "failure") payment.errorMessage = "Simulated payment failure";
    if (outcome === "success") {
      const registrationId = this.paymentRegistrations[publicId];
      const registration = this.registrations.find((entry) => entry.publicId === registrationId);
      if (registration?.status === "waiting_payment") {
        registration.status = "approved";
        registration.statusLabel = "Approved / Confirmed";
        registration.payment = {
          publicId: payment.publicId,
          status: payment.status,
          amountCents: payment.amountCents,
          currency: payment.currency,
          isSimulated: payment.isSimulated,
        };
      }
    }
    return payment;
  }

  async getPayment(publicId: string) {
    const payment = this.payments.find((entry) => entry.publicId === publicId);
    if (!payment) throw new DemoError("not_found", "Payment not found.", 404);
    return payment;
  }

  async getSite(locale: Locale): Promise<SiteResponse> {
    const snapshot = siteSnapshot as Record<
      string,
      { strings: Record<string, string>; nav: unknown; offers: unknown; footer: unknown }
    >;
    // Fall back to "en" when the requested locale isn't in the snapshot, and
    // report the locale actually served rather than echoing back the
    // (unsupported) requested one, matching the backend's coercion.
    const servedLocale: Locale = snapshot[locale] ? locale : "en";
    const snap = snapshot[servedLocale];
    return {
      locale: servedLocale,
      strings: snap.strings,
      nav: snap.nav,
      offers: snap.offers,
      footer: snap.footer,
    } as SiteResponse;
  }

  async getContent(slug: string, locale: Locale): Promise<ContentPageResponse> {
    const key = slug.replace(/-/g, "_");
    const localeSnap =
      (siteSnapshot as Record<string, { pages: Record<string, ContentPageResponse | null> }>)[locale] ??
      (siteSnapshot as Record<string, { pages: Record<string, ContentPageResponse | null> }>)["en"];
    const page = localeSnap.pages[key];
    if (!page) {
      throw new DemoError("not_found", "Page not found.", 404);
    }
    return page;
  }

  async getFormOptions(): Promise<FormOptions> {
    return {
      countries: [
        { code: "DE", label: "Germany" },
        { code: "ES", label: "Spain" },
        { code: "FR", label: "France" },
        { code: "IT", label: "Italy" },
        { code: "TR", label: "Turkey" },
      ],
      languages: [
        { code: "de", label: "German" },
        { code: "en", label: "English" },
        { code: "es", label: "Spanish" },
        { code: "fr", label: "French" },
        { code: "it", label: "Italian" },
        { code: "tr", label: "Turkish" },
      ],
      occupations: ["Student at RWTH Aachen", "Student at FH Aachen", "other"],
      languageLevels: [
        { value: "1", label: "Beginner" },
        { value: "2", label: "Elementary" },
        { value: "3", label: "Intermediate" },
        { value: "4", label: "Advanced" },
        { value: "5", label: "Native / near-native" },
      ],
    };
  }

  async submitContact(input: ContactSubmission) {
    if (!input.name.trim() || !input.email.includes("@") || !input.message.trim()) {
      throw new DemoError("validation_failed", "Some fields are invalid.", 422, {
        fields: {
          ...(input.name.trim() ? {} : { name: "Name is required." }),
          ...(input.email.includes("@") ? {} : { email: "Enter a valid email address." }),
          ...(input.message.trim() ? {} : { message: "Message is required." }),
        },
      });
    }
    const id = this.nextId++;
    const submissionId = `CON-${id.toString().padStart(6, "0")}`;
    this.formInbox.unshift({
      type: "contact", id, publicId: submissionId, name: input.name, email: input.email,
      phone: "", subject: input.subject, message: input.message, kind: "", status: "new",
      isViewed: false, createdAt: new Date().toISOString(),
    });
    return { submissionId };
  }

  async submitEventSuggestion(input: EventSuggestionSubmission) {
    if (!input.country.trim() || !input.contactName.trim() || (!input.contactEmail && !input.contactPhone)) {
      throw new DemoError("validation_failed", "Some fields are invalid.", 422, {
        fields: { country: "Country or culture and contact details are required." },
      });
    }
    const id = this.nextId++;
    const submissionId = `SUG-${id.toString().padStart(6, "0")}`;
    this.formInbox.unshift({
      type: "suggestion", id, publicId: submissionId, name: input.contactName,
      email: input.contactEmail, phone: input.contactPhone, subject: input.country,
      message: input.comment, kind: input.kind, status: "new", isViewed: false,
      createdAt: new Date().toISOString(),
    });
    return { submissionId };
  }

  async submitTandem(input: TandemSubmission) {
    if (!input.firstName || !input.lastName || !input.email.includes("@") || !input.offeredLanguages.length || !input.requestedLanguages.length) {
      throw new DemoError("validation_failed", "Some fields are invalid.", 422, {
        fields: { firstName: "Complete all required profile and language fields." },
      });
    }
    return { submissionId: `TAN-${(this.nextId++).toString().padStart(6, "0")}` };
  }

  async registerForEvent(slug: string, input: EventRegistrationInput): Promise<RegistrationRecord> {
    const event = this.events.find((entry) => entry.slug === slug);
    if (!event?.registration) throw new DemoError("registration_unavailable", "Registration unavailable.", 422);
    if (!input.firstName || !input.lastName || !input.email.includes("@") || !input.occupation) {
      throw new DemoError("validation_failed", "Some fields are invalid.", 422, {
        fields: { firstName: "Complete all required fields." },
      });
    }
    const publicId = `APP-DEMO${this.nextId++}`;
    const status: EventRegistrationStatus = event.registration.placesRemaining > 0
      ? event.registration.priceCents ? "waiting_payment" : "approved"
      : "waiting_list";
    const now = new Date().toISOString();
    const item: RegistrationRecord = {
      id: this.nextId++, publicId, name: `${input.firstName} ${input.lastName}`,
      firstName: input.firstName, lastName: input.lastName, email: input.email,
      occupation: input.occupation, dietPreference: input.dietPreference, comment: input.comment,
      status, statusLabel: status.replaceAll("_", " "), waitingListPosition: status === "waiting_list" ? 1 : null,
      event: { slug: event.slug, title: event.title.full, startsAt: event.startsAt, capacity: event.registration.capacity, placesRemaining: event.registration.placesRemaining, priceCents: event.registration.priceCents, isDeposit: event.registration.isDeposit },
      payment: null, trackingPath: `/registrations/${publicId}`, createdAt: now, updatedAt: now,
    };
    this.registrations.push(item);
    return item;
  }

  async getRegistration(publicId: string) {
    const item = this.registrations.find((entry) => entry.publicId === publicId);
    if (!item) throw new DemoError("not_found", "Registration not found.", 404);
    return item;
  }

  async getFormInbox(params?: { type?: string; status?: string; q?: string }) {
    this.require("forms");
    const query = params?.q?.toLocaleLowerCase() ?? "";
    return {
      items: this.formInbox.filter((item) =>
        (!params?.type || item.type === params.type)
        && (!params?.status || item.status === params.status)
        && (!query || `${item.publicId} ${item.name} ${item.email} ${item.subject}`.toLocaleLowerCase().includes(query)),
      ),
    };
  }

  async updateFormInbox(type: string, id: number, input: { status?: string; isViewed?: boolean }) {
    this.require("forms");
    const item = this.formInbox.find((entry) => entry.type === type && entry.id === id);
    if (!item) throw new DemoError("not_found", "Form entry not found.", 404);
    if (input.status) item.status = input.status as FormInboxEntry["status"];
    if (input.isViewed !== undefined) item.isViewed = input.isViewed;
    return item;
  }

  private queueSummary(event: PublicPost): EventQueueSummary {
    const registration = event.registration!;
    const items = this.registrations.filter((item) => item.event.slug === event.slug);
    return {
      postId: this.events.indexOf(event) + 1, slug: event.slug, title: event.title.full,
      startsAt: event.startsAt, capacity: registration.capacity,
      confirmedCount: registration.confirmedCount + items.filter((item) => item.status === "approved").length,
      reservedCount: registration.reservedCount + items.filter((item) => ["approved", "waiting_payment"].includes(item.status)).length,
      waitingListCount: registration.waitingListCount + items.filter((item) => item.status === "waiting_list").length,
      nonCancelledCount: registration.nonCancelledCount + items.filter((item) => item.status !== "cancelled").length,
      placesRemaining: registration.placesRemaining, priceCents: registration.priceCents,
      isDeposit: registration.isDeposit,
    };
  }

  async getEventQueues() {
    this.require("event_registrations");
    return { events: this.events.filter((event) => event.registration).map((event) => this.queueSummary(event)) };
  }

  async getEventRegistrations(postId: number, params?: { status?: string; q?: string }) {
    this.require("event_registrations");
    const event = this.events[postId - 1];
    if (!event?.registration) throw new DemoError("not_found", "Event queue not found.", 404);
    const query = params?.q?.toLocaleLowerCase() ?? "";
    const items = this.registrations.filter((item) =>
      item.event.slug === event.slug
      && (!params?.status || item.status === params.status)
      && (!query || `${item.publicId} ${item.name}`.toLocaleLowerCase().includes(query)),
    );
    return { event: this.queueSummary(event), items };
  }

  async updateEventRegistration(id: number, status: EventRegistrationStatus) {
    this.require("event_registrations");
    const item = this.registrations.find((entry) => entry.id === id);
    if (!item) throw new DemoError("not_found", "Registration not found.", 404);
    item.status = status;
    item.statusLabel = status.replaceAll("_", " ");
    item.updatedAt = new Date().toISOString();
    const event = this.events.find((entry) => entry.slug === item.event.slug)!;
    return { item, promoted: [] as RegistrationRecord[], event: this.queueSummary(event) };
  }

  async getAccessKeys() {
    this.require("access_keys");
    return {
      items: this.accessKeys,
      availableScopes: Object.entries(CAPABILITY_LABELS)
        .filter(([value]) => value !== "access_keys")
        .map(([value, label]) => ({ value, label })),
    };
  }

  async createAccessKey(input: { label: string; scopes: string[]; expiresAt: string }): Promise<CreatedAccessKey> {
    this.require("access_keys");
    const id = this.nextId++;
    const secret = `demo-generated-${id}`;
    DEMO_KEYS[secret] = input.scopes;
    const item: CreatedAccessKey = {
      id, label: input.label, prefix: secret.slice(0, 8), scopes: input.scopes,
      status: "active", expiresAt: input.expiresAt, revokedAt: null, lastUsedAt: null,
      createdAt: new Date().toISOString(), secret, unlockFragment: `/app/#/admin/unlock/${secret}`,
      secretVisibleOnce: true,
    };
    this.accessKeys.unshift(item);
    return item;
  }

  async revokeAccessKey(id: number) {
    this.require("access_keys");
    const item = this.accessKeys.find((entry) => entry.id === id);
    if (!item) throw new DemoError("not_found", "Access key not found.", 404);
    item.status = "revoked";
    item.revokedAt = new Date().toISOString();
    return item;
  }

  async expireAccessKey(id: number) {
    this.require("access_keys");
    const item = this.accessKeys.find((entry) => entry.id === id);
    if (!item) throw new DemoError("not_found", "Access key not found.", 404);
    item.status = "expired";
    item.expiresAt = new Date().toISOString();
    return item;
  }

  async getAdminPayments(status?: string): Promise<{ items: AdminPayment[] }> {
    this.require("event_registrations");
    const items = this.payments.map((payment, index) => {
      const registration = this.registrations.find((entry) => entry.publicId === this.paymentRegistrations[payment.publicId]);
      return { ...payment, id: index + 1, eventTitle: registration?.event.title ?? "", eventSlug: registration?.event.slug ?? "", registrationPublicId: registration?.publicId ?? null, registrationName: registration?.name ?? null, createdAt: new Date().toISOString() };
    }).filter((payment) => !status || payment.status === status);
    return { items };
  }

  async updateAdminPayment(id: number, status: "refund_pending" | "refunded" | "cancelled") {
    const { items } = await this.getAdminPayments();
    const item = items.find((payment) => payment.id === id);
    if (!item) throw new DemoError("not_found", "Payment not found.", 404);
    this.payments[id - 1].status = status;
    return { ...item, status };
  }
}
