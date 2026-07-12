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
  hasAccessKeys: boolean;
  newScopes?: string[];
};

export type PublicConfig = {
  themes: Record<string, string>;
};

export type PublicationState = "draft" | "scheduled" | "live" | "archived" | "inactive";

export type EventMapPoint = {
  name: string;
  coordinates: [number, number];
};

export type EventMapConfig = {
  providerId: "openlayers" | "amcharts-maps" | "openstreetmap" | string;
  providerName: string;
  title: string;
  description: string;
  note: string;
  target: {
    kind: "country" | "country_group" | "trip" | "marker" | string;
    label?: string | null;
    countryCodes?: string[];
    center?: [number, number] | null;
    zoom?: number | null;
    marker?: EventMapPoint | null;
    origin?: EventMapPoint | null;
    destination?: EventMapPoint | null;
  };
};

export type EventRegistrationSummary = {
  hasQueue: true;
  availability: "available" | "waiting_list" | "closed";
  capacity: number;
  confirmedCount: number;
  reservedCount: number;
  waitingListCount: number;
  nonCancelledCount: number;
  placesRemaining: number;
  mode: "none" | "queue" | "karaoke";
  priceCents: number | null;
  currency: string;
  isDeposit: boolean;
  depositExplanation: string;
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
  publicationState: PublicationState;
  startsAt: string | null;
  endsAt: string | null;
  durationMinutes: number | null;
  imageUrl: string;
  bodyHtml?: string;
  eventPublicId: string | null;
  venue: string;
  address: string;
  city: string;
  meetingPoint: string;
  destination: string;
  coordinates: { latitude: number; longitude: number } | null;
  destinationCoordinates: { latitude: number; longitude: number } | null;
  countryCode: string | null;
  socialLinks: { provider: string; url: string }[];
  features: string[];
  map: EventMapConfig | null;
  registration: EventRegistrationSummary | null;
};

export type PublicPostsResponse = {
  events: PublicPost[];
  posts: PublicPost[];
  archivedEvents: PublicPost[];
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
  endsAt: string | null;
  durationMinutes: number | null;
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
  registrationMode: "none" | "queue" | "karaoke";
  depositExplanation: string;
  venue: string;
  address: string;
  city: string;
  meetingPoint: string;
  destination: string;
  countryCode: string;
  latitude: number | null;
  longitude: number | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  mapConfig: Record<string, unknown>;
  featureFlags: string[];
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
  eventKind: string | null;
  startsAt: string | null;
  endsAt: string | null;
  durationMinutes: number | null;
  publishAt: string | null;
  status: PostStatus;
  isPinned: boolean;
  imageUrl: string;
  registrationLimitEnabled: boolean;
  registrationLimit: number | null;
  registrationPriceCents: number | null;
  registrationIsDeposit: boolean;
  registrationMode: "none" | "queue" | "karaoke";
  depositExplanation: string;
  venue: string;
  address: string;
  city: string;
  meetingPoint: string;
  destination: string;
  countryCode: string;
  latitude: number | null;
  longitude: number | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  mapConfig: Record<string, unknown>;
  featureFlags: string[];
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

export type AdminSocialPublication = SocialPublication & {
  postTitle: string;
  postSlug: string;
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
  review: {
    hidden: boolean;
    shortlisted: boolean;
    contactedAt: string | null;
    finalPairAt: string | null;
  };
};

export type TandemMatchesResponse = {
  source: TandemRequest;
  groups: Record<string, TandemMatch[]>;
  totals: Record<string, number>;
};

export type TandemReviewAction = "hide" | "show" | "shortlist" | "unshortlist" | "contacted" | "uncontacted" | "final_pair" | "unpair";

export type TandemDuplicate = {
  left: TandemRequest;
  right: TandemRequest;
  category: "exact" | "likely";
  score: number;
  reasons: string[];
  decision: "ignore" | "different" | null;
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
  eventSlug: string | null;
  eventTitle: string | null;
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
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  isSimulated: boolean;
  errorMessage: string;
  checkoutUrl?: string;
  simulated?: boolean;
};

export type AdminPayment = PaymentInfo & {
  id: number;
  postId: number | null;
  registrationId: number | null;
  eventTitle: string;
  eventSlug: string;
  registrationPublicId: string | null;
  registrationName: string | null;
  createdAt: string;
  audit: {
    previousStatus: PaymentStatus;
    newStatus: PaymentStatus;
    actor: string;
    note: string;
    createdAt: string;
  }[];
};

export type FormOptions = {
  countries: { code: string; label: string }[];
  languages: { code: string; label: string }[];
  occupations: string[];
  languageLevels: { value: string; label: string }[];
};

export type ContactSubmission = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export type EventSuggestionSubmission = {
  kind: "country_evening" | "breakfast";
  country: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  comment: string;
};

export type TandemSubmission = {
  firstName: string;
  lastName: string;
  email: string;
  occupation: string;
  occupationOther: string;
  gender: string;
  birthYear: string;
  departureDate: string;
  countryOfOrigin: string;
  offeredLanguages: string[];
  offeredLanguageLevels: Record<string, string>;
  requestedLanguages: string[];
  requestedNativeOnly: boolean;
  sameGenderOnly: boolean;
  preferredGender: string;
  comment: string;
};

export type EventRegistrationInput = {
  firstName: string;
  lastName: string;
  email: string;
  occupation: string;
  dietPreference: "" | "vegan" | "vegetarian" | "omnivore";
  comment: string;
};

export type EventRegistrationStatus =
  | "approved"
  | "cancelled"
  | "waiting_payment"
  | "waiting_list"
  | "waiting_refund";

export type RegistrationRecord = {
  id?: number;
  publicId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  occupation?: string;
  dietPreference?: string;
  comment?: string;
  allowedTransitions?: EventRegistrationStatus[];
  status: EventRegistrationStatus;
  statusLabel: string;
  waitingListPosition: number | null;
  event: {
    slug: string;
    title: string;
    startsAt: string | null;
    capacity: number | null;
    placesRemaining: number;
    priceCents: number | null;
    isDeposit: boolean;
  };
  payment: {
    publicId: string;
    status: PaymentStatus;
    amountCents: number;
    currency: string;
    isSimulated: boolean;
  } | null;
  trackingPath: string;
  createdAt: string;
  updatedAt: string;
};

export type EventQueueSummary = {
  postId: number;
  slug: string;
  title: string;
  startsAt: string | null;
  capacity: number;
  confirmedCount: number;
  reservedCount: number;
  waitingListCount: number;
  nonCancelledCount: number;
  placesRemaining: number;
  priceCents: number | null;
  isDeposit: boolean;
};

export type FormInboxEntry = {
  type: "contact" | "suggestion";
  id: number;
  publicId: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  kind: string;
  status: "new" | "in_progress" | "resolved" | "archived";
  isViewed: boolean;
  createdAt: string;
};

export type AccessKeyInfo = {
  id: number;
  label: string;
  prefix: string;
  scopes: string[];
  status: "active" | "expired" | "revoked";
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

export type CreatedAccessKey = AccessKeyInfo & {
  secret: string;
  unlockFragment: string;
  secretVisibleOnce: true;
};

export type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> & { fields?: Record<string, string> };
  };
};

export type Locale = "en" | "de";

export interface SiteNavItem {
  label: string;
  to: string | null;
  children?: SiteNavItem[];
}

export interface SiteOfferPage {
  title: string;
  to: string;
  icon: string;
  description: string;
}

export interface SiteOfferForm {
  title: string;
  to: string;
}

export interface SiteFooterSocial {
  platform: string;
  url: string | null;
}

export interface SiteFooterLink {
  title: string;
  to: string;
}

export interface SiteResponse {
  locale: Locale;
  strings: Record<string, string>;
  nav: SiteNavItem[];
  offers: {
    title: string;
    subtitle: string;
    pages: SiteOfferPage[];
    forms: SiteOfferForm[];
  };
  footer: {
    copy: string;
    social: SiteFooterSocial[];
    offerLinks: SiteFooterLink[];
  };
}

export interface ContentPageResponse {
  slug: string;
  title: string;
  image: string | null;
  bodyHtml: string;
  form: {
    type: "suggest_event" | "language_tandem";
    preset?: Record<string, string>;
  } | null;
}
