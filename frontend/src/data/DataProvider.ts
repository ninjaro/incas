import type {
  AdminPost,
  AdminPayment,
  AccessKeyInfo,
  CreatedAccessKey,
  AdminPostsResponse,
  AdminThemesResponse,
  CalendarResponse,
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
  KaraokePublicEntry,
  KaraokeSubmission,
  Locale,
  PageId,
  PaymentInfo,
  PostInput,
  PostTemplateInfo,
  PublicConfig,
  PublicPost,
  PublicPostsResponse,
  RegistrationRecord,
  SessionInfo,
  SiteResponse,
  SocialPublication,
  AdminSocialPublication,
  TandemListResponse,
  TandemDuplicate,
  TandemMatch,
  TandemMatchesResponse,
  TandemRequest,
  TandemReviewAction,
  TandemSubmission,
  ThemeAuditEntry,
} from "../api/types";

/**
 * Every page talks to the backend through this interface.
 *
 * ApiDataProvider forwards to the Flask JSON API; DemoDataProvider serves the
 * same shapes from local fixtures with an in-memory state, which is what the
 * static GitHub Pages demo runs on. Pages never know which one they get.
 */
export interface DataProvider {
  readonly isDemo: boolean;

  getSession(): Promise<SessionInfo>;
  unlock(key: string): Promise<SessionInfo>;

  getPublicConfig(): Promise<PublicConfig>;
  getPublicPosts(): Promise<PublicPostsResponse>;
  getPublicPost(slug: string): Promise<PublicPost>;
  getCalendar(year: number, month: number): Promise<CalendarResponse>;
  getSite(locale: Locale): Promise<SiteResponse>;
  getContent(slug: string, locale: Locale, section?: ContentSection): Promise<ContentPageResponse>;
  getFormOptions(): Promise<FormOptions>;
  submitContact(input: ContactSubmission): Promise<{ submissionId: string }>;
  submitEventSuggestion(input: EventSuggestionSubmission): Promise<{ submissionId: string }>;
  submitTandem(input: TandemSubmission): Promise<{ submissionId: string }>;
  registerForEvent(slug: string, input: EventRegistrationInput): Promise<RegistrationRecord>;
  getRegistration(publicId: string): Promise<RegistrationRecord>;

  getAdminThemes(): Promise<AdminThemesResponse>;
  voteTheme(page: PageId, theme: string): Promise<{ myVote: string; votes: Record<string, number> }>;
  forceTheme(
    page: PageId,
    theme: string,
    note?: string,
  ): Promise<{ publicTheme: string; forcedAt: string; nextChangeAt: string }>;
  getThemeAudit(page?: string): Promise<{ entries: ThemeAuditEntry[] }>;

  getAdminPosts(params?: { status?: string; page?: number }): Promise<AdminPostsResponse>;
  getAdminPost(id: number): Promise<AdminPost>;
  createPost(input: PostInput): Promise<AdminPost>;
  updatePost(id: number, input: PostInput): Promise<AdminPost>;
  getTemplates(): Promise<{ items: PostTemplateInfo[] }>;
  createTemplate(input: Partial<PostTemplateInfo>): Promise<PostTemplateInfo>;
  updateTemplate(id: number, input: Partial<PostTemplateInfo>): Promise<PostTemplateInfo>;
  deleteTemplate(id: number): Promise<void>;
  duplicateTemplate(id: number): Promise<PostTemplateInfo>;
  createPostFromTemplate(templateId: number): Promise<AdminPost>;
  publishSocial(postId: number, channels: string[]): Promise<{ results: SocialPublication[] }>;
  retrySocial(publicationId: number): Promise<{ results: SocialPublication[] }>;
  getAdminSocial(params?: { status?: string; provider?: string }): Promise<{ items: AdminSocialPublication[] }>;
  getFormInbox(params?: { type?: string; status?: string; q?: string }): Promise<{ items: FormInboxEntry[] }>;
  updateFormInbox(type: string, id: number, input: { status?: string; isViewed?: boolean }): Promise<FormInboxEntry>;
  getEventQueues(): Promise<{ events: EventQueueSummary[] }>;
  getEventRegistrations(postId: number, params?: { status?: string; q?: string }): Promise<{ event: EventQueueSummary; items: RegistrationRecord[] }>;
  updateEventRegistration(id: number, status: EventRegistrationStatus): Promise<{ item: RegistrationRecord; promoted: RegistrationRecord[]; event: EventQueueSummary }>;
  getAccessKeys(): Promise<{ items: AccessKeyInfo[]; availableScopes: { value: string; label: string }[] }>;
  createAccessKey(input: { label: string; scopes: string[]; expiresAt: string }): Promise<CreatedAccessKey>;
  revokeAccessKey(id: number): Promise<AccessKeyInfo>;
  expireAccessKey(id: number): Promise<AccessKeyInfo>;
  getAdminPayments(status?: string): Promise<{ items: AdminPayment[] }>;
  updateAdminPayment(id: number, status: "refund_pending" | "refunded" | "cancelled"): Promise<AdminPayment>;

  getTandemRequests(params?: { q?: string; viewed?: string }): Promise<TandemListResponse>;
  getTandemMatches(ref: string): Promise<TandemMatchesResponse>;
  updateTandem(ref: string, input: Record<string, unknown>): Promise<TandemRequest>;
  markTandemViewed(ref: string, isViewed: boolean): Promise<{ ref: string; isViewed: boolean }>;
  reviewTandemMatch(sourceRef: string, candidateRef: string, action: TandemReviewAction): Promise<TandemMatch["review"]>;
  getTandemDuplicates(): Promise<{ items: TandemDuplicate[] }>;
  decideTandemDuplicate(leftRef: string, rightRef: string, decision: "ignore" | "different", note?: string): Promise<{ decision: string; note: string }>;
  mergeTandemDuplicate(keepRef: string, removeRef: string, fields?: Record<string, string>): Promise<TandemRequest>;

  submitKaraokeRequest(input: KaraokeSubmission): Promise<{ publicId: string; status: string }>;
  trackKaraokeRequest(publicId: string): Promise<KaraokePublicEntry>;
  trackKaraokeRequests(publicIds: string[]): Promise<{ items: KaraokePublicEntry[]; missing: string[] }>;
  getKaraokeQueue(eventSlug?: string): Promise<{ items: KaraokePublicEntry[] }>;
  getAdminKaraoke(status?: string, eventSlug?: string): Promise<{ items: KaraokeAdminEntry[]; events: { slug: string; title: string; startsAt: string | null }[] }>;
  karaokeAction(id: number, action: KaraokeAction): Promise<KaraokeAdminEntry>;
  reorderKaraoke(order: number[]): Promise<{ items: KaraokeAdminEntry[] }>;
  getKaraokeAudit(): Promise<{ entries: KaraokeAuditEntry[] }>;

  startCheckout(postSlug: string, registrationPublicId: string): Promise<PaymentInfo>;
  simulatePayment(publicId: string, outcome: "success" | "failure" | "cancel"): Promise<PaymentInfo>;
  getPayment(publicId: string): Promise<PaymentInfo>;
}
