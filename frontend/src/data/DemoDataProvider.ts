import type {
  AdminPost,
  AdminSocialPublication,
  AdminPayment,
  AccessKeyInfo,
  CreatedAccessKey,
  Capability,
  ContactSubmission,
  ContentPageResponse,
  ContentSection,
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
import { KARAOKE_TRACKING_BATCH_SIZE, trackKaraokeInBatches } from "./karaokeTracking";
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
  "demo-ref-aaab": { firstName: "Lucia", lastName: "Demo", email: "lucia@example.com" },
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
  private postSlugRedirects = new Map<string, string>();
  private formInbox: FormInboxEntry[] = [];
  private accessKeys: AccessKeyInfo[] = [];
  private generatedKeys = new Map<
    string,
    { item: AccessKeyInfo; scopes: Capability[] }
  >();
  private staticUnlockedScopes = new Set<Capability>();
  private generatedUnlocks = new Set<string>();
  private tandemRequests = structuredClone(demoTandemRequests);
  private tandemPrivate = structuredClone(DEMO_PRIVATE_FIELDS);
  private tandemReviews: Record<string, TandemMatch["review"]> = {};
  private tandemDuplicateDecisions: Record<string, { decision: "ignore" | "different"; note: string }> = {};
  private nextId = 1000;

  private require(capability: Capability) {
    this.refreshCapabilities();
    if (!this.capabilities.has(capability)) {
      throw new DemoError(
        "capability_required",
        "This action requires an additional access key.",
        403,
        { capability },
      );
    }
  }

  private refreshCapabilities() {
    const capabilities = new Set(this.staticUnlockedScopes);
    for (const secret of [...this.generatedUnlocks]) {
      const generated = this.generatedKeys.get(secret);
      const expiresAt = generated ? new Date(generated.item.expiresAt).valueOf() : 0;
      if (
        !generated
        || generated.item.status !== "active"
        || !Number.isFinite(expiresAt)
        || expiresAt <= Date.now()
      ) {
        this.generatedUnlocks.delete(secret);
        continue;
      }
      generated.scopes.forEach((scope) => capabilities.add(scope));
    }
    if (capabilities.has("theme_force")) capabilities.add("theme_review");
    this.capabilities = capabilities;
  }

  private paymentForRegistration(item: RegistrationRecord) {
    return [...this.payments].reverse().find(
      (payment) => this.paymentRegistrations[payment.publicId] === item.publicId,
    );
  }

  private publicRegistration(item: RegistrationRecord): RegistrationRecord {
    const {
      id: _id,
      firstName: _firstName,
      lastName: _lastName,
      email: _email,
      occupation: _occupation,
      dietPreference: _dietPreference,
      comment: _comment,
      allowedTransitions: _allowedTransitions,
      ...publicItem
    } = item;
    return publicItem;
  }

  private allowedRegistrationTransitions(item: RegistrationRecord): EventRegistrationStatus[] {
    const event = this.events.find((entry) => entry.slug === item.event.slug);
    const payment = this.paymentForRegistration(item);
    if (!event?.registration) return [];
    if (item.status === "waiting_payment") return ["cancelled"];
    if (item.status === "approved") {
      return payment?.status === "paid" ? ["waiting_refund"] : ["cancelled"];
    }
    if (item.status === "waiting_list") {
      const choices: EventRegistrationStatus[] = ["cancelled"];
      if (this.queueSummary(event).placesRemaining > 0) {
        choices.unshift(event.registration.priceCents ? "waiting_payment" : "approved");
      }
      return choices;
    }
    if (item.status === "cancelled") return ["waiting_list"];
    return [];
  }

  private promoteRegistrationWaitingList(event: PublicPost) {
    const promoted: RegistrationRecord[] = [];
    while (this.queueSummary(event).placesRemaining > 0) {
      const candidate = this.registrations.find(
        (entry) => entry.event.slug === event.slug && entry.status === "waiting_list",
      );
      if (!candidate) break;
      candidate.status = event.registration?.priceCents ? "waiting_payment" : "approved";
      candidate.statusLabel = candidate.status.replaceAll("_", " ");
      candidate.waitingListPosition = null;
      candidate.updatedAt = new Date().toISOString();
      promoted.push(candidate);
    }
    return promoted;
  }

  private session(): SessionInfo {
    this.refreshCapabilities();
    return {
      capabilities: [...this.capabilities].sort(),
      capabilityLabels: CAPABILITY_LABELS,
      sessionAuditId: "demo-session",
      hasAccessKeys: true,
    };
  }

  private tandemReviewKey(sourceRef: string, candidateRef: string) {
    return `${sourceRef}\0${candidateRef}`;
  }

  private tandemDuplicateKey(leftRef: string, rightRef: string) {
    return [leftRef, rightRef].sort().join("\0");
  }

  async getSession() {
    return this.session();
  }

  async unlock(key: string) {
    const normalized = key.trim();
    const staticScopes = DEMO_KEYS[normalized] as Capability[] | undefined;
    const generated = this.generatedKeys.get(normalized);
    const expiresAt = generated ? new Date(generated.item.expiresAt).valueOf() : 0;
    if (
      !staticScopes
      && (
        !generated
        || generated.item.status !== "active"
        || !Number.isFinite(expiresAt)
        || expiresAt <= Date.now()
      )
    ) {
      throw new DemoError("key_invalid", "This access key is not valid.", 403);
    }
    if (staticScopes) {
      staticScopes.forEach((scope) => this.staticUnlockedScopes.add(scope));
    } else {
      this.generatedUnlocks.add(normalized);
      generated!.item.lastUsedAt = new Date().toISOString();
    }
    const scopes = staticScopes ?? generated!.scopes;
    return { ...this.session(), newScopes: scopes };
  }

  async getPublicConfig() {
    return {
      themes: { ...this.publicThemes },
      integrations: {
        payment: { provider: "mock", isSimulated: true },
        social: { mode: "mock", isSimulated: true },
      },
    };
  }

  async getPublicPosts() {
    return {
      events: this.events.filter((event) => event.isLive),
      posts: demoPosts,
      archivedEvents: this.events.filter((event) => !event.isLive),
    };
  }

  async getPublicPost(slug: string) {
    let canonicalSlug = slug;
    const visited = new Set<string>();
    while (this.postSlugRedirects.has(canonicalSlug) && !visited.has(canonicalSlug)) {
      visited.add(canonicalSlug);
      canonicalSlug = this.postSlugRedirects.get(canonicalSlug)!;
    }
    const post = [...this.events, ...demoPosts].find((entry) => entry.slug === canonicalSlug);
    if (!post) throw new DemoError("not_found", "Post not found.", 404);
    return { ...post, bodyHtml: post.bodyHtml ?? "" };
  }

  async getCalendar(year: number, month: number) {
    const events = this.events.filter((event) => {
      if (!event.startsAt) return false;
      const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en", {
          timeZone: "Europe/Berlin",
          year: "numeric",
          month: "numeric",
        }).formatToParts(new Date(event.startsAt)).map((part) => [part.type, part.value]),
      );
      return Number(parts.year) === year && Number(parts.month) === month;
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
      isActive: ["published", "scheduled"].includes(input.status ?? "draft"),
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
    const assign = <K extends keyof PostInput & keyof AdminPost>(key: K) => {
      if (input[key] !== undefined) {
        (post[key] as PostInput[K]) = input[key];
      }
    };
    for (const key of [
      "title",
      "summary",
      "body",
      "eventKind",
      "startsAt",
      "endsAt",
      "durationMinutes",
      "publishAt",
      "isPinned",
      "imageUrl",
      "registrationLimitEnabled",
      "registrationLimit",
      "registrationPriceCents",
      "registrationIsDeposit",
      "registrationMode",
      "depositExplanation",
      "venue",
      "address",
      "city",
      "meetingPoint",
      "destination",
      "countryCode",
      "latitude",
      "longitude",
      "destinationLatitude",
      "destinationLongitude",
      "mapConfig",
      "featureFlags",
    ] as const) {
      assign(key);
    }
    if (input.status !== undefined) {
      post.status = input.status;
      post.storedStatus = input.status;
      post.isActive = ["published", "scheduled"].includes(input.status);
    }
    post.updatedAt = new Date().toISOString();
    return post;
  }

  async updatePostSlug(id: number, slug: string) {
    const post = await this.getAdminPost(id);
    const normalized = slug.trim().toLowerCase();
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)
      || this.adminPosts.some((entry) => entry.id !== id && entry.slug === normalized)
      || this.postSlugRedirects.has(normalized)
    ) {
      throw new DemoError("validation_failed", "Some fields are invalid.", 422, {
        fields: { slug: "This URL slug is invalid or already in use." },
      });
    }
    if (normalized !== post.slug) {
      const oldSlug = post.slug;
      for (const [source, target] of this.postSlugRedirects) {
        if (target === oldSlug) this.postSlugRedirects.set(source, normalized);
      }
      this.postSlugRedirects.set(oldSlug, normalized);
      post.slug = normalized;
      const publicPost = [...this.events, ...demoPosts].find(
        (entry) => entry.slug === oldSlug,
      );
      if (publicPost) publicPost.slug = normalized;
      post.updatedAt = new Date().toISOString();
    }
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
      items: this.tandemRequests.filter((item) =>
        (!params?.viewed || params.viewed === "all" || item.isViewed === (params.viewed === "yes"))
        && (!params?.q || `${item.ref} ${this.tandemPrivate[item.ref]?.firstName ?? ""} ${this.tandemPrivate[item.ref]?.lastName ?? ""}`.toLowerCase().includes(params.q.toLowerCase())),
      ).map((item) =>
        showPrivate ? { ...item, ...this.tandemPrivate[item.ref], comment: "" } : item,
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
        review: this.tandemReviews[this.tandemReviewKey(source.ref, candidate.ref)]
          ?? { hidden: false, shortlisted: false, contactedAt: null, finalPairAt: null },
      }));
    return {
      source,
      groups: {
        full: matches.filter((match) => match.category === "full"),
        partial: matches.filter((match) => match.category === "partial"),
        weak: [],
      },
      totals: {
        full: matches.filter((match) => match.category === "full").length,
        partial: matches.filter((match) => match.category === "partial").length,
        weak: 0,
      },
    };
  }

  async updateTandem(ref: string, input: Record<string, unknown>) {
    this.require("language_tandem_corrections");
    const item = this.tandemRequests.find((entry) => entry.ref === ref);
    if (!item) throw new DemoError("not_found", "Request not found.", 404);
    Object.assign(item, input);
    return item;
  }

  async markTandemViewed(ref: string, isViewed: boolean) {
    this.require("language_tandem_blind");
    const item = this.tandemRequests.find((entry) => entry.ref === ref);
    if (!item) throw new DemoError("not_found", "Request not found.", 404);
    item.isViewed = isViewed;
    return { ref, isViewed };
  }

  async reviewTandemMatch(sourceRef: string, candidateRef: string, action: TandemReviewAction): Promise<TandemMatch["review"]> {
    this.require("language_tandem_blind");
    if (["contacted", "final_pair"].includes(action) && !this.capabilities.has("language_tandem_private")) {
      throw new DemoError("capability_required", "Contact workflow needs private Tandem access.", 403);
    }
    if (!this.tandemRequests.some((item) => item.ref === sourceRef)
      || !this.tandemRequests.some((item) => item.ref === candidateRef)
      || sourceRef === candidateRef) {
      throw new DemoError("not_found", "Match pair not found.", 404);
    }
    const key = this.tandemReviewKey(sourceRef, candidateRef);
    const review = this.tandemReviews[key]
      ?? { hidden: false, shortlisted: false, contactedAt: null, finalPairAt: null };
    if (action === "hide") review.hidden = true;
    if (action === "show") review.hidden = false;
    if (action === "shortlist") review.shortlisted = true;
    if (action === "unshortlist") review.shortlisted = false;
    if (action === "contacted") review.contactedAt = new Date().toISOString();
    if (action === "uncontacted") review.contactedAt = null;
    if (action === "final_pair") {
      review.finalPairAt = new Date().toISOString();
      review.shortlisted = true;
    }
    if (action === "unpair") review.finalPairAt = null;
    this.tandemReviews[key] = review;
    return { ...review };
  }

  async getTandemDuplicates(): Promise<{ items: TandemDuplicate[] }> {
    this.require("language_tandem_corrections");
    const items: TandemDuplicate[] = [];
    this.tandemRequests.forEach((left, leftIndex) => {
      this.tandemRequests.slice(leftIndex + 1).forEach((right) => {
        const leftPrivate = this.tandemPrivate[left.ref];
        const rightPrivate = this.tandemPrivate[right.ref];
        const sameEmail = leftPrivate?.email.toLowerCase() === rightPrivate?.email.toLowerCase();
        const sameName = `${leftPrivate?.firstName} ${leftPrivate?.lastName}`.toLowerCase()
          === `${rightPrivate?.firstName} ${rightPrivate?.lastName}`.toLowerCase();
        if (!sameEmail && !sameName) return;
        const stored = this.tandemDuplicateDecisions[this.tandemDuplicateKey(left.ref, right.ref)];
        items.push({
          left: { ...left, ...leftPrivate, comment: "" },
          right: { ...right, ...rightPrivate, comment: "" },
          category: sameEmail ? "exact" : "likely",
          score: sameEmail ? 100 : 85,
          reasons: [sameEmail ? "Same email address" : "Same full name"],
          decision: stored?.decision ?? null,
        });
      });
    });
    return { items };
  }

  async decideTandemDuplicate(leftRef: string, rightRef: string, decision: "ignore" | "different", note = "") {
    this.require("language_tandem_corrections");
    if (!this.tandemRequests.some((item) => item.ref === leftRef)
      || !this.tandemRequests.some((item) => item.ref === rightRef)) {
      throw new DemoError("not_found", "Duplicate pair not found.", 404);
    }
    this.tandemDuplicateDecisions[this.tandemDuplicateKey(leftRef, rightRef)] = { decision, note };
    return { decision, note };
  }

  async mergeTandemDuplicate(keepRef: string, removeRef: string, fields: Record<string, string> = {}): Promise<TandemRequest> {
    this.require("language_tandem_corrections");
    const keep = this.tandemRequests.find((entry) => entry.ref === keepRef);
    const remove = this.tandemRequests.find((entry) => entry.ref === removeRef);
    if (!keep || !remove || keep === remove) throw new DemoError("not_found", "Request not found.", 404);
    (Object.keys(keep) as (keyof TandemRequest)[]).forEach((field) => {
      if (field !== "ref" && fields[field] === "remove") {
        (keep as Record<string, unknown>)[field] = remove[field];
      }
    });
    const privateKeep = this.tandemPrivate[keepRef];
    const privateRemove = this.tandemPrivate[removeRef];
    (["firstName", "lastName", "email"] as const).forEach((field) => {
      if (fields[field] === "remove" && privateKeep && privateRemove) privateKeep[field] = privateRemove[field];
    });
    Object.entries(this.tandemReviews).forEach(([key, review]) => {
      const [source, candidate] = key.split("\0");
      if (source !== removeRef && candidate !== removeRef) return;
      delete this.tandemReviews[key];
      const nextSource = source === removeRef ? keepRef : source;
      const nextCandidate = candidate === removeRef ? keepRef : candidate;
      if (nextSource !== nextCandidate) this.tandemReviews[this.tandemReviewKey(nextSource, nextCandidate)] = review;
    });
    this.tandemRequests = this.tandemRequests.filter((entry) => entry.ref !== removeRef);
    delete this.tandemPrivate[removeRef];
    Object.keys(this.tandemDuplicateDecisions).forEach((key) => {
      if (key.split("\0").includes(removeRef)) delete this.tandemDuplicateDecisions[key];
    });
    return { ...keep, ...privateKeep, comment: "" };
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
    const event = this.events.find(
      (candidate) => candidate.slug === input.eventSlug && candidate.eventKind === "karaoke",
    );
    if (!event) throw new DemoError("event_required", "Select a karaoke event.", 422);
    const entry: KaraokeAdminEntry = {
      id: this.nextId++,
      publicId: `KRQ-DEMO${this.nextId}`,
      postId: this.events.indexOf(event) + 1,
      displayName: input.displayName,
      songTitle: input.songTitle,
      artist: input.artist ?? "",
      note: input.note ?? "",
      contact: input.contact ?? "",
      status: "pending",
      position: null,
      queuePosition: null,
      eventSlug: event.slug,
      eventTitle: event.title.full,
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

  async trackKaraokeRequests(publicIds: string[]) {
    return trackKaraokeInBatches(publicIds, async (batch) => {
      if (batch.length > KARAOKE_TRACKING_BATCH_SIZE) {
        throw new DemoError(
          "validation_failed",
          "Provide between 1 and 20 tracking codes.",
          422,
        );
      }
      const items = batch
        .map((publicId) => this.karaoke.find((entry) => entry.publicId === publicId))
        .filter((entry): entry is KaraokeAdminEntry => Boolean(entry))
        .map((entry) => this.publicEntry(entry));
      const found = new Set(items.map((entry) => entry.publicId));
      return { items, missing: batch.filter((publicId) => !found.has(publicId)) };
    });
  }

  private publicEntry(entry: KaraokeAdminEntry) {
    const queue = this.karaoke
      .filter((item) => (item.status === "approved" || item.status === "performing")
        && item.eventSlug === entry.eventSlug)
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

    const sources: Record<KaraokeAction, KaraokeStatus[]> = {
      approve: ["pending"], reject: ["pending"],
      cancel: ["pending", "approved", "performing"],
      restore: ["cancelled", "rejected"], performing: ["approved"],
      complete: ["performing", "approved"],
    };
    if (!sources[action].includes(entry.status)) {
      throw new DemoError("invalid_transition", "This karaoke action is not allowed.", 409);
    }

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
      const max = Math.max(0, ...this.karaoke.filter((item) => item.eventSlug === entry.eventSlug).map((item) => item.position ?? 0));
      entry.position = max + 1;
    }
    if (["reject", "cancel", "restore", "complete"].includes(action)) {
      entry.position = null;
    }
    return { ...entry, queuePosition: this.publicEntry(entry).queuePosition };
  }

  async reorderKaraoke(order: number[]) {
    this.require("karaoke_queue");
    const entries = order.map((id) => this.karaoke.find((item) => item.id === id));
    const eventSlug = entries[0]?.eventSlug;
    if (!order.length || entries.some((entry) => !entry || entry.eventSlug !== eventSlug)) {
      throw new DemoError("queue_conflict", "Reordering cannot cross karaoke events.", 409);
    }
    const currentIds = this.karaoke
      .filter((item) => item.eventSlug === eventSlug && ["approved", "performing"].includes(item.status))
      .map((item) => item.id);
    if (
      order.length !== new Set(order).size
      || order.length !== currentIds.length
      || order.some((id) => !currentIds.includes(id))
    ) {
      throw new DemoError("queue_conflict", "The queue changed; reload before reordering.", 409);
    }
    order.forEach((id, index) => {
      const entry = this.karaoke.find((item) => item.id === id);
      if (entry) entry.position = index + 1;
    });
    return this.getAdminKaraoke(undefined, eventSlug ?? undefined);
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
    const existing = this.payments.find(
      (entry) => this.paymentRegistrations[entry.publicId] === registrationPublicId
        && ["pending", "paid"].includes(entry.status),
    );
    if (existing) return existing;
    if (!registration || registration.status !== "waiting_payment") {
      throw new DemoError("registration_not_payable", "Create an eligible registration first.", 409);
    }
    const expiresAt = registration.paymentExpiresAt
      ?? new Date(Date.now() + 20 * 60_000).toISOString();
    const payment: PaymentInfo = {
      publicId: `PAY-DEMO-${this.nextId++}`,
      amountCents: post.registration.priceCents,
      currency: "EUR",
      status: "pending",
      provider: "mock",
      isSimulated: true,
      errorMessage: "",
      expiresAt,
      createdAt: new Date().toISOString(),
      checkoutUrl: "#/pay/simulated",
      simulated: true,
    };
    this.payments.push(payment);
    this.paymentRegistrations[payment.publicId] = registration.publicId;
    registration.payment = payment;
    registration.paymentExpiresAt = expiresAt;
    return payment;
  }

  async simulatePayment(publicId: string, outcome: "success" | "failure" | "cancel") {
    const payment = this.payments.find((entry) => entry.publicId === publicId);
    if (!payment) throw new DemoError("not_found", "Payment not found.", 404);
    if (payment.status !== "pending") {
      throw new DemoError("payment_finalized", "This payment is already finalized.", 409);
    }
    const registrationId = this.paymentRegistrations[publicId];
    const registration = this.registrations.find((entry) => entry.publicId === registrationId);
    if (outcome === "success" && registration?.status !== "waiting_payment") {
      payment.status = "failed";
      payment.errorMessage = "Registration is no longer eligible for payment.";
      return payment;
    }
    payment.status =
      outcome === "success" ? "paid" : outcome === "failure" ? "failed" : "cancelled";
    if (outcome === "failure") payment.errorMessage = "Simulated payment failure";
    if (outcome === "success") {
      if (registration?.status === "waiting_payment") {
        registration.status = "approved";
        registration.statusLabel = "Approved / Confirmed";
        registration.payment = {
          publicId: payment.publicId,
          status: payment.status,
          amountCents: payment.amountCents,
          currency: payment.currency,
          provider: payment.provider,
          isSimulated: payment.isSimulated,
          errorMessage: payment.errorMessage,
          expiresAt: payment.expiresAt,
          createdAt: payment.createdAt,
          checkoutUrl: payment.checkoutUrl,
          simulated: payment.simulated,
        };
        registration.paymentExpiresAt = null;
      }
    } else if (outcome === "cancel" && registration) {
      registration.status = "cancelled";
      registration.statusLabel = "Cancelled";
      registration.paymentExpiresAt = null;
      registration.payment = payment;
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

  async getContent(slug: string, locale: Locale, section?: ContentSection): Promise<ContentPageResponse> {
    const key = slug.replace(/-/g, "_");
    const localeSnap =
      (siteSnapshot as Record<string, { pages: Record<string, ContentPageResponse | null> }>)[locale] ??
      (siteSnapshot as Record<string, { pages: Record<string, ContentPageResponse | null> }>)["en"];
    const page = localeSnap.pages[key];
    if (!page) {
      throw new DemoError("not_found", "Page not found.", 404);
    }
    if (section && page.section !== section) {
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
    const duplicate = this.registrations.find(
      (entry) => entry.event.slug === slug
        && entry.email?.toLocaleLowerCase() === input.email.toLocaleLowerCase()
        && entry.status !== "cancelled",
    );
    if (duplicate) {
      throw new DemoError(
        "registration_conflict",
        "A new registration cannot be created with these details.",
        409,
      );
    }
    const publicId = `APP-DEMO${this.nextId++}`;
    const summary = this.queueSummary(event);
    const status: EventRegistrationStatus = summary.placesRemaining > 0
      ? event.registration.priceCents ? "waiting_payment" : "approved"
      : "waiting_list";
    const now = new Date().toISOString();
    const paymentExpiresAt = status === "waiting_payment"
      ? new Date(Date.now() + 20 * 60_000).toISOString()
      : null;
    const item: RegistrationRecord = {
      id: this.nextId++, publicId, name: `${input.firstName} ${input.lastName}`,
      firstName: input.firstName, lastName: input.lastName, email: input.email,
      occupation: input.occupation, dietPreference: input.dietPreference, comment: input.comment,
      status, statusLabel: status.replaceAll("_", " "), waitingListPosition: status === "waiting_list" ? summary.waitingListCount + 1 : null,
      event: { slug: event.slug, title: event.title.full, startsAt: event.startsAt, capacity: event.registration.capacity, placesRemaining: summary.placesRemaining, priceCents: event.registration.priceCents, isDeposit: event.registration.isDeposit },
      payment: null, paymentExpiresAt, trackingPath: `/registrations/${publicId}`, createdAt: now, updatedAt: now,
    };
    this.registrations.push(item);
    return this.publicRegistration(item);
  }

  async getRegistration(publicId: string) {
    const item = this.registrations.find((entry) => entry.publicId === publicId);
    if (!item) throw new DemoError("not_found", "Registration not found.", 404);
    return this.publicRegistration(item);
  }

  async recoverRegistration(_eventSlug: string, _email: string) {
    return {
      accepted: true as const,
      message: "If a matching active registration exists, its private link will be sent.",
    };
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
    const dynamicReserved = items.filter((item) => ["approved", "waiting_payment"].includes(item.status)).length;
    const reservedCount = registration.reservedCount + dynamicReserved;
    return {
      postId: this.events.indexOf(event) + 1, slug: event.slug, title: event.title.full,
      startsAt: event.startsAt, capacity: registration.capacity,
      confirmedCount: registration.confirmedCount + items.filter((item) => item.status === "approved").length,
      reservedCount,
      waitingListCount: registration.waitingListCount + items.filter((item) => item.status === "waiting_list").length,
      nonCancelledCount: registration.nonCancelledCount + items.filter((item) => item.status !== "cancelled").length,
      placesRemaining: Math.max(registration.capacity - reservedCount, 0), priceCents: registration.priceCents,
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
    return {
      event: this.queueSummary(event),
      items: items.map((item) => ({
        ...item,
        allowedTransitions: this.allowedRegistrationTransitions(item),
      })),
    };
  }

  async updateEventRegistration(id: number, status: EventRegistrationStatus) {
    this.require("event_registrations");
    const item = this.registrations.find((entry) => entry.id === id);
    if (!item) throw new DemoError("not_found", "Registration not found.", 404);
    if (status === item.status) {
      const event = this.events.find((entry) => entry.slug === item.event.slug)!;
      return { item, promoted: [] as RegistrationRecord[], event: this.queueSummary(event) };
    }
    if (!this.allowedRegistrationTransitions(item).includes(status)) {
      throw new DemoError("invalid_transition", "This registration status change is not allowed.", 409);
    }
    const previous = item.status;
    const payment = this.paymentForRegistration(item);
    if (status === "waiting_refund") {
      if (payment?.status !== "paid") {
        throw new DemoError("invalid_transition", "A paid payment is required.", 409);
      }
      payment.status = "refund_pending";
    } else if (status === "cancelled" && payment?.status === "pending") {
      payment.status = "cancelled";
    }
    item.status = status;
    item.statusLabel = status.replaceAll("_", " ");
    item.updatedAt = new Date().toISOString();
    const event = this.events.find((entry) => entry.slug === item.event.slug)!;
    const released = ["approved", "waiting_payment"].includes(previous)
      && !["approved", "waiting_payment"].includes(status);
    const reopened = previous === "cancelled" && status === "waiting_list";
    const promoted = released || reopened ? this.promoteRegistrationWaitingList(event) : [];
    return { item, promoted, event: this.queueSummary(event) };
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
    const item: CreatedAccessKey = {
      id, label: input.label, prefix: secret.slice(0, 8), scopes: input.scopes,
      status: "active", expiresAt: input.expiresAt, revokedAt: null, lastUsedAt: null,
      createdAt: new Date().toISOString(), secret, unlockFragment: `#/admin?accessKey=${encodeURIComponent(secret)}`,
      secretVisibleOnce: true,
    };
    this.generatedKeys.set(secret, {
      item,
      scopes: input.scopes as Capability[],
    });
    this.accessKeys.unshift(item);
    return item;
  }

  async revokeAccessKey(id: number) {
    this.require("access_keys");
    const item = this.accessKeys.find((entry) => entry.id === id);
    if (!item) throw new DemoError("not_found", "Access key not found.", 404);
    item.status = "revoked";
    item.revokedAt = new Date().toISOString();
    this.refreshCapabilities();
    return item;
  }

  async expireAccessKey(id: number) {
    this.require("access_keys");
    const item = this.accessKeys.find((entry) => entry.id === id);
    if (!item) throw new DemoError("not_found", "Access key not found.", 404);
    item.status = "expired";
    item.expiresAt = new Date().toISOString();
    this.refreshCapabilities();
    return item;
  }

  async getAdminPayments(status?: string): Promise<{ items: AdminPayment[] }> {
    this.require("event_registrations");
    const items = this.payments.map((payment, index) => {
      const registration = this.registrations.find((entry) => entry.publicId === this.paymentRegistrations[payment.publicId]);
      return { ...payment, id: index + 1, postId: null, registrationId: registration?.id ?? null, eventTitle: registration?.event.title ?? "", eventSlug: registration?.event.slug ?? "", registrationPublicId: registration?.publicId ?? null, registrationName: registration?.name ?? null, createdAt: new Date().toISOString(), audit: [] };
    }).filter((payment) => !status || payment.status === status);
    return { items };
  }

  async updateAdminPayment(id: number, status: "refund_pending" | "refunded" | "cancelled") {
    const { items } = await this.getAdminPayments();
    const item = items.find((payment) => payment.id === id);
    if (!item) throw new DemoError("not_found", "Payment not found.", 404);
    const payment = this.payments[id - 1];
    const valid = (payment.status === "paid" && status === "refund_pending")
      || (payment.status === "refund_pending" && status === "refunded")
      || (["pending", "failed"].includes(payment.status) && status === "cancelled");
    if (!valid) throw new DemoError("invalid_transition", "This payment status change is not allowed.", 409);
    payment.status = status;
    const registrationId = this.paymentRegistrations[payment.publicId];
    const registration = this.registrations.find((entry) => entry.publicId === registrationId);
    if (registration && status === "refund_pending") registration.status = "waiting_refund";
    if (registration && ["refunded", "cancelled"].includes(status)) {
      registration.status = "cancelled";
      const event = this.events.find((entry) => entry.slug === registration.event.slug);
      if (event) this.promoteRegistrationWaitingList(event);
    }
    return { ...item, status };
  }
}
