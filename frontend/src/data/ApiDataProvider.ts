import { http } from "../api/client";
import type {
  AdminPost,
  AdminPostsResponse,
  AdminThemesResponse,
  CalendarResponse,
  ContentPageResponse,
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
  SessionInfo,
  SiteResponse,
  SocialPublication,
  TandemListResponse,
  TandemMatchesResponse,
  ThemeAuditEntry,
} from "../api/types";
import type { DataProvider } from "./DataProvider";

export class ApiDataProvider implements DataProvider {
  readonly isDemo = false;

  getSession() {
    return http.get<SessionInfo>("/session");
  }

  unlock(key: string) {
    return http.post<SessionInfo>("/access/unlock", { key });
  }

  getPublicConfig() {
    return http.get<PublicConfig>("/public/config");
  }

  getPublicPosts() {
    return http.get<PublicPostsResponse>("/public/posts");
  }

  getPublicPost(slug: string) {
    return http.get<PublicPost>(`/public/posts/${encodeURIComponent(slug)}`);
  }

  getCalendar(year: number, month: number) {
    return http.get<CalendarResponse>(`/public/calendar?year=${year}&month=${month}`);
  }

  getSite(locale: Locale) {
    return http.get<SiteResponse>(`/public/site?locale=${locale}`);
  }

  getContent(slug: string, locale: Locale) {
    return http.get<ContentPageResponse>(
      `/public/content/${encodeURIComponent(slug)}?locale=${locale}`,
    );
  }

  getAdminThemes() {
    return http.get<AdminThemesResponse>("/admin/themes");
  }

  voteTheme(page: PageId, theme: string) {
    return http.post<{ myVote: string; votes: Record<string, number> }>("/admin/theme-votes", {
      page,
      theme,
    });
  }

  forceTheme(page: PageId, theme: string, note?: string) {
    return http.post<{ publicTheme: string; forcedAt: string; nextChangeAt: string }>(
      "/admin/theme-forces",
      { page, theme, note },
    );
  }

  getThemeAudit(page?: string) {
    const query = page ? `?page=${encodeURIComponent(page)}` : "";
    return http.get<{ entries: ThemeAuditEntry[] }>(`/admin/theme-audit${query}`);
  }

  getAdminPosts(params?: { status?: string; page?: number }) {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.page) search.set("page", String(params.page));
    const query = search.toString();
    return http.get<AdminPostsResponse>(`/admin/posts${query ? `?${query}` : ""}`);
  }

  getAdminPost(id: number) {
    return http.get<AdminPost>(`/admin/posts/${id}`);
  }

  createPost(input: PostInput) {
    return http.post<AdminPost>("/admin/posts", input);
  }

  updatePost(id: number, input: PostInput) {
    return http.put<AdminPost>(`/admin/posts/${id}`, input);
  }

  getTemplates() {
    return http.get<{ items: PostTemplateInfo[] }>("/admin/post-templates");
  }

  createTemplate(input: Partial<PostTemplateInfo>) {
    return http.post<PostTemplateInfo>("/admin/post-templates", input);
  }

  updateTemplate(id: number, input: Partial<PostTemplateInfo>) {
    return http.put<PostTemplateInfo>(`/admin/post-templates/${id}`, input);
  }

  async deleteTemplate(id: number) {
    await http.delete(`/admin/post-templates/${id}`);
  }

  duplicateTemplate(id: number) {
    return http.post<PostTemplateInfo>(`/admin/post-templates/${id}/duplicate`);
  }

  createPostFromTemplate(templateId: number) {
    return http.post<AdminPost>("/admin/posts/from-template", { templateId });
  }

  publishSocial(postId: number, channels: string[]) {
    return http.post<{ results: SocialPublication[] }>(`/admin/posts/${postId}/social`, {
      channels,
    });
  }

  retrySocial(publicationId: number) {
    return http.post<{ results: SocialPublication[] }>(`/admin/social/${publicationId}/retry`);
  }

  getTandemRequests() {
    return http.get<TandemListResponse>("/admin/language-tandem");
  }

  getTandemMatches(ref: string) {
    return http.get<TandemMatchesResponse>(
      `/admin/language-tandem/${encodeURIComponent(ref)}/matches`,
    );
  }

  submitKaraokeRequest(input: KaraokeSubmission) {
    return http.post<{ publicId: string; status: string }>("/public/karaoke/requests", input);
  }

  trackKaraokeRequest(publicId: string) {
    return http.get<KaraokePublicEntry>(
      `/public/karaoke/requests/${encodeURIComponent(publicId)}`,
    );
  }

  getKaraokeQueue(eventSlug?: string) {
    const query = eventSlug ? `?event=${encodeURIComponent(eventSlug)}` : "";
    return http.get<{ items: KaraokePublicEntry[] }>(`/public/karaoke/queue${query}`);
  }

  getAdminKaraoke(status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return http.get<{ items: KaraokeAdminEntry[] }>(`/admin/karaoke${query}`);
  }

  karaokeAction(id: number, action: KaraokeAction) {
    return http.post<KaraokeAdminEntry>(`/admin/karaoke/${id}/${action}`);
  }

  reorderKaraoke(order: number[]) {
    return http.post<{ items: KaraokeAdminEntry[] }>("/admin/karaoke/reorder", { order });
  }

  getKaraokeAudit() {
    return http.get<{ entries: KaraokeAuditEntry[] }>("/admin/karaoke/audit");
  }

  startCheckout(postSlug: string, registrationPublicId?: string) {
    return http.post<PaymentInfo>("/payments/checkout", { postSlug, registrationPublicId });
  }

  simulatePayment(publicId: string, outcome: "success" | "failure" | "cancel") {
    return http.post<PaymentInfo>(`/payments/${encodeURIComponent(publicId)}/simulate`, {
      outcome,
    });
  }

  getPayment(publicId: string) {
    return http.get<PaymentInfo>(`/payments/${encodeURIComponent(publicId)}`);
  }
}
