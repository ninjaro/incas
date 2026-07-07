export type PageId =
  | "landing"
  | "calendar"
  | "language_tandem"
  | "team"
  | "admin_dashboard";

export type Capability =
  | "posts"
  | "event_registrations"
  | "forms"
  | "access_keys"
  | "language_tandem_blind"
  | "language_tandem_private"
  | "language_tandem_corrections"
  | "theme_review"
  | "theme_force"
  | "karaoke_queue";

export type SessionInfo = {
  capabilities: Capability[];
  capabilityLabels: Record<string, string>;
  sessionAuditId: string;
  newScopes?: string[];
};

export type PublicConfig = {
  themes: Record<string, string>;
};

export type PostTitle = {
  full: string;
  prefix: string;
  focus: string;
};

export type PublicPost = {
  slug: string;
  title: PostTitle;
  summary: string;
  eventKind: string | null;
  isEvent: boolean;
  isPinned: boolean;
  isLive: boolean;
  startsAt: string | null;
  imageUrl: string;
  body?: string;
  registration: {
    hasQueue: boolean;
    priceCents: number | null;
    isDeposit: boolean;
    placesRemaining: number;
  } | null;
};

export type PublicPostsResponse = {
  events: PublicPost[];
  posts: PublicPost[];
};

export type CalendarResponse = {
  year: number;
  month: number;
  events: PublicPost[];
};

export type ThemeInfo = {
  themeId: string;
  name: string;
  description: string;
  enabled: boolean;
  isDefault: boolean;
  votes?: number;
};

export type ThemePageInfo = {
  pageId: PageId;
  name: string;
  defaultTheme: string;
  themes: ThemeInfo[];
  publicTheme: string;
  myVote: string | null;
  forceLock: {
    isLocked: boolean;
    lockedUntil: string | null;
    lastForcedAt?: string;
  };
};

export type AdminThemesResponse = {
  pages: ThemePageInfo[];
  canForce: boolean;
};

export type ThemeAuditEntry = {
  pageId: string;
  previousTheme: string;
  newTheme: string;
  action: string;
  actor: string;
  note: string;
  createdAt: string;
};

export type PostStatus = "draft" | "scheduled" | "published" | "archived";

export type AdminPost = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  body: string;
  eventKind: string | null;
  startsAt: string | null;
  publishAt: string | null;
  status: PostStatus;
  storedStatus: PostStatus;
  isActive: boolean;
  isPinned: boolean;
  imageUrl: string;
  registrationLimitEnabled: boolean;
  registrationLimit: number | null;
  registrationPriceCents: number | null;
  registrationIsDeposit: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  social?: SocialPublication[];
};

export type AdminPostsResponse = {
  items: AdminPost[];
  page: number;
  perPage: number;
  total: number;
  pages: number;
};

export type PostInput = Partial<{
  title: string;
  summary: string;
  body: string;
  eventKind: string;
  startsAt: string;
  publishAt: string;
  status: PostStatus;
  isPinned: boolean;
  imageUrl: string;
  registrationLimitEnabled: boolean;
  registrationLimit: number | null;
  registrationPriceCents: number | null;
  registrationIsDeposit: boolean;
  socialChannels: string[];
}>;

export type PostTemplateInfo = {
  id: number;
  name: string;
  titlePattern: string;
  summary: string;
  body: string;
  eventKind: string | null;
  registrationLimitEnabled: boolean;
  registrationLimit: number | null;
  registrationPriceCents: number | null;
  registrationIsDeposit: boolean;
  imageUrl: string;
  socialSettings: Record<string, unknown>;
  updatedAt: string | null;
};

export type SocialPublication = {
  id: number;
  postId: number;
  provider: string;
  status: "scheduled" | "published" | "failed";
  providerPostId: string;
  permalink: string;
  mediaUrl: string;
  errorCode: string;
  errorMessage: string;
  attemptCount: number;
  isSimulated: boolean;
  scheduledFor: string | null;
  lastAttemptAt: string | null;
};

export type TandemRequest = {
  ref: string;
  gender: string;
  birthYear: number;
  occupation: string;
  countryOfOrigin: string;
  departureDate: string | null;
  offeredLanguages: string[];
  offeredNativeLanguages: string[];
  offeredLanguageLevels: Record<string, string>;
  requestedLanguages: string[];
  requestedNativeOnly: boolean;
  sameGenderOnly: boolean;
  preferredGender: string;
  isViewed: boolean;
  createdAt: string | null;
  // Only present with the language_tandem_private capability.
  id?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  comment?: string;
};

export type TandemListResponse = {
  items: TandemRequest[];
  capabilities: { private: boolean; corrections: boolean };
};

export type TandemMatch = {
  candidate: TandemRequest;
  category: "full" | "partial" | "weak";
  score: number;
  reasons: string[];
  warnings: string[];
};

export type TandemMatchesResponse = {
  source: TandemRequest;
  groups: Record<string, TandemMatch[]>;
  totals: Record<string, number>;
};

export type KaraokeStatus =
  | "pending"
  | "approved"
  | "performing"
  | "completed"
  | "rejected"
  | "cancelled";

export type KaraokePublicEntry = {
  publicId: string;
  displayName: string;
  songTitle: string;
  artist: string;
  status: KaraokeStatus;
  queuePosition: number | null;
};

export type KaraokeAdminEntry = KaraokePublicEntry & {
  id: number;
  postId: number | null;
  note: string;
  contact: string;
  position: number | null;
  createdAt: string | null;
};

export type KaraokeSubmission = {
  displayName: string;
  songTitle: string;
  artist?: string;
  note?: string;
  contact?: string;
  eventSlug?: string;
};

export type KaraokeAuditEntry = {
  requestId: number;
  action: string;
  detail: string;
  actor: string;
  createdAt: string;
};

export type KaraokeAction =
  | "approve"
  | "reject"
  | "cancel"
  | "restore"
  | "performing"
  | "complete";

export type PaymentStatus =
  | "not_required"
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "refund_pending"
  | "refunded";

export type PaymentInfo = {
  publicId: string;
  postId: number | null;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  isSimulated: boolean;
  errorMessage: string;
  checkoutUrl?: string;
  simulated?: boolean;
};

export type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> & { fields?: Record<string, string> };
  };
};
