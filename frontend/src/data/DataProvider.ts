import type {
  AdminPost,
  AdminPostsResponse,
  AdminThemesResponse,
  CalendarResponse,
  KaraokeAction,
  KaraokeAdminEntry,
  KaraokeAuditEntry,
  KaraokePublicEntry,
  KaraokeSubmission,
  PageId,
  PaymentInfo,
  PostInput,
  PostTemplateInfo,
  PublicConfig,
  PublicPost,
  PublicPostsResponse,
  SessionInfo,
  SocialPublication,
  TandemListResponse,
  TandemMatchesResponse,
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

  getTandemRequests(): Promise<TandemListResponse>;
  getTandemMatches(ref: string): Promise<TandemMatchesResponse>;

  submitKaraokeRequest(input: KaraokeSubmission): Promise<{ publicId: string; status: string }>;
  trackKaraokeRequest(publicId: string): Promise<KaraokePublicEntry>;
  getKaraokeQueue(eventSlug?: string): Promise<{ items: KaraokePublicEntry[] }>;
  getAdminKaraoke(status?: string): Promise<{ items: KaraokeAdminEntry[] }>;
  karaokeAction(id: number, action: KaraokeAction): Promise<KaraokeAdminEntry>;
  reorderKaraoke(order: number[]): Promise<{ items: KaraokeAdminEntry[] }>;
  getKaraokeAudit(): Promise<{ entries: KaraokeAuditEntry[] }>;

  startCheckout(postSlug: string, registrationPublicId?: string): Promise<PaymentInfo>;
  simulatePayment(publicId: string, outcome: "success" | "failure" | "cancel"): Promise<PaymentInfo>;
  getPayment(publicId: string): Promise<PaymentInfo>;
}
