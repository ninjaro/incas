import type {
  AdminPost,
  Capability,
  ContentPageResponse,
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
  SessionInfo,
  SiteResponse,
  SocialPublication,
  ThemeAuditEntry,
} from "../api/types";
import siteSnapshot from "../content/site.generated.json";
import { PAGE_THEMES } from "../features/themes/registry";
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

class DemoError extends Error {
  code: string;
  status: number;
  fields: Record<string, string>;
  details: Record<string, unknown>;

  constructor(code: string, message: string, status = 400, details: Record<string, unknown> = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
    this.fields = (details.fields as Record<string, string>) ?? {};
  }
}

const CAPABILITY_LABELS: Record<string, string> = {
  posts: "Posts and Events",
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
  private karaoke: KaraokeAdminEntry[] = buildDemoKaraoke();
  private publicThemes: Record<string, string> = Object.fromEntries(
    Object.entries(PAGE_THEMES).map(([pageId, page]) => [pageId, page.defaultTheme]),
  );
  private votes: Record<string, Record<string, number>> = {};
  private myVotes: Record<string, string> = {};
  private lastForcedAt: Record<string, string> = {};
  private themeAudit: ThemeAuditEntry[] = [];
  private payments: PaymentInfo[] = [];
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
    return { events: this.events, posts: demoPosts };
  }

  async getPublicPost(slug: string) {
    const post = [...this.events, ...demoPosts].find((entry) => entry.slug === slug);
    if (!post) throw new DemoError("not_found", "Post not found.", 404);
    return { ...post, body: `${post.summary}\n\nThis is synthetic demo content.` };
  }

  async getCalendar(year: number, month: number) {
    const events = this.events.filter((event) => {
      if (!event.startsAt) return false;
      const date = new Date(event.startsAt);
      return date.getFullYear() === year && date.getMonth() + 1 === month;
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
      publishAt: input.publishAt ?? post.publishAt,
      status: input.status ?? post.status,
      storedStatus: input.status ?? post.storedStatus,
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

  async getTandemRequests() {
    this.require("language_tandem_blind");
    const showPrivate = this.capabilities.has("language_tandem_private");
    return {
      items: demoTandemRequests.map((item) =>
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
    };
  }

  async getKaraokeQueue() {
    const queue = this.karaoke
      .filter((item) => item.status === "approved" || item.status === "performing")
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    return { items: queue.map((entry) => this.publicEntry(entry)) };
  }

  async getAdminKaraoke(status?: string) {
    this.require("karaoke_queue");
    const items = status ? this.karaoke.filter((item) => item.status === status) : this.karaoke;
    return {
      items: [...items].sort((a, b) => (a.position ?? 999) - (b.position ?? 999)),
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
    return this.getAdminKaraoke();
  }

  async getKaraokeAudit() {
    this.require("karaoke_queue");
    return { entries: [] as KaraokeAuditEntry[] };
  }

  async startCheckout(postSlug: string) {
    const post = this.events.find((event) => event.slug === postSlug);
    if (!post?.registration?.priceCents) {
      throw new DemoError("payment_not_required", "This event does not require payment.", 422);
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
    return payment;
  }

  async simulatePayment(publicId: string, outcome: "success" | "failure" | "cancel") {
    const payment = this.payments.find((entry) => entry.publicId === publicId);
    if (!payment) throw new DemoError("not_found", "Payment not found.", 404);
    payment.status =
      outcome === "success" ? "paid" : outcome === "failure" ? "failed" : "cancelled";
    if (outcome === "failure") payment.errorMessage = "Simulated payment failure";
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
}
