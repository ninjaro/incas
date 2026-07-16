import { http } from "../api/client";
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
import type { DataProvider } from "./DataProvider";
import { trackKaraokeInBatches } from "./karaokeTracking";

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

  getContent(slug: string, locale: Locale, section?: ContentSection) {
    const sectionQuery = section ? `&section=${encodeURIComponent(section)}` : "";
    return http.get<ContentPageResponse>(
      `/public/content/${encodeURIComponent(slug)}?locale=${locale}${sectionQuery}`,
    );
  }

  getFormOptions() {
    return http.get<FormOptions>("/public/forms/options");
  }

  submitContact(input: ContactSubmission) {
    return http.post<{ submissionId: string }>("/public/contact", input);
  }

  submitEventSuggestion(input: EventSuggestionSubmission) {
    return http.post<{ submissionId: string }>("/public/event-suggestions", input);
  }

  submitTandem(input: TandemSubmission) {
    return http.post<{ submissionId: string }>("/public/language-tandem", input);
  }

  registerForEvent(slug: string, input: EventRegistrationInput) {
    return http.post<RegistrationRecord>(`/public/events/${encodeURIComponent(slug)}/registrations`, input);
  }

  getRegistration(publicId: string) {
    return http.get<RegistrationRecord>(`/public/registrations/${encodeURIComponent(publicId)}`);
  }

  recoverRegistration(eventSlug: string, email: string) {
    return http.post<{ accepted: true; message: string }>("/public/registrations/recover", {
      eventSlug,
      email,
    });
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

  updatePostSlug(id: number, slug: string) {
    return http.patch<AdminPost>(`/admin/posts/${id}/slug`, { slug });
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

  getAdminSocial(params?: { status?: string; provider?: string }) {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.provider) search.set("provider", params.provider);
    return http.get<{ items: AdminSocialPublication[] }>(`/admin/social${search.size ? `?${search}` : ""}`);
  }

  getFormInbox(params?: { type?: string; status?: string; q?: string }) {
    const search = new URLSearchParams();
    if (params?.type) search.set("type", params.type);
    if (params?.status) search.set("status", params.status);
    if (params?.q) search.set("q", params.q);
    return http.get<{ items: FormInboxEntry[] }>(`/admin/forms${search.size ? `?${search}` : ""}`);
  }

  updateFormInbox(type: string, id: number, input: { status?: string; isViewed?: boolean }) {
    return http.patch<FormInboxEntry>(`/admin/forms/${encodeURIComponent(type)}/${id}`, input);
  }

  getEventQueues() {
    return http.get<{ events: EventQueueSummary[] }>("/admin/event-registrations");
  }

  getEventRegistrations(postId: number, params?: { status?: string; q?: string }) {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.q) search.set("q", params.q);
    return http.get<{ event: EventQueueSummary; items: RegistrationRecord[] }>(
      `/admin/events/${postId}/registrations${search.size ? `?${search}` : ""}`,
    );
  }

  updateEventRegistration(id: number, status: EventRegistrationStatus) {
    return http.patch<{ item: RegistrationRecord; promoted: RegistrationRecord[]; event: EventQueueSummary }>(
      `/admin/event-registrations/${id}`,
      { status },
    );
  }

  getAccessKeys() {
    return http.get<{ items: AccessKeyInfo[]; availableScopes: { value: string; label: string }[] }>(
      "/admin/access-keys",
    );
  }

  createAccessKey(input: { label: string; scopes: string[]; expiresAt: string }) {
    return http.post<CreatedAccessKey>("/admin/access-keys", input);
  }

  revokeAccessKey(id: number) {
    return http.post<AccessKeyInfo>(`/admin/access-keys/${id}/revoke`);
  }

  expireAccessKey(id: number) {
    return http.post<AccessKeyInfo>(`/admin/access-keys/${id}/expire`);
  }

  getAdminPayments(status?: string) {
    return http.get<{ items: AdminPayment[] }>(`/admin/payments${status ? `?status=${encodeURIComponent(status)}` : ""}`);
  }

  updateAdminPayment(id: number, status: "refund_pending" | "refunded" | "cancelled") {
    return http.patch<AdminPayment>(`/admin/payments/${id}`, { status });
  }

  getTandemRequests(params?: { q?: string; viewed?: string }) {
    const search = new URLSearchParams();
    if (params?.q) search.set("q", params.q);
    if (params?.viewed) search.set("viewed", params.viewed);
    return http.get<TandemListResponse>(`/admin/language-tandem${search.size ? `?${search}` : ""}`);
  }

  getTandemMatches(ref: string) {
    return http.get<TandemMatchesResponse>(
      `/admin/language-tandem/${encodeURIComponent(ref)}/matches`,
    );
  }

  updateTandem(ref: string, input: Record<string, unknown>) {
    return http.put<TandemRequest>(`/admin/language-tandem/${encodeURIComponent(ref)}`, input);
  }

  markTandemViewed(ref: string, isViewed: boolean) {
    return http.post<{ ref: string; isViewed: boolean }>(
      `/admin/language-tandem/${encodeURIComponent(ref)}/viewed`,
      { isViewed },
    );
  }

  reviewTandemMatch(sourceRef: string, candidateRef: string, action: TandemReviewAction) {
    return http.post<TandemMatch["review"]>(
      `/admin/language-tandem/${encodeURIComponent(sourceRef)}/matches/${encodeURIComponent(candidateRef)}/review`,
      { action },
    );
  }

  getTandemDuplicates() {
    return http.get<{ items: TandemDuplicate[] }>("/admin/language-tandem/duplicates");
  }

  decideTandemDuplicate(leftRef: string, rightRef: string, decision: "ignore" | "different", note?: string) {
    return http.post<{ decision: string; note: string }>("/admin/language-tandem/duplicates/decision", {
      leftRef, rightRef, decision, note,
    });
  }

  mergeTandemDuplicate(keepRef: string, removeRef: string, fields?: Record<string, string>) {
    return http.post<TandemRequest>("/admin/language-tandem/duplicates/merge", {
      keepRef, removeRef, fields,
    });
  }

  submitKaraokeRequest(input: KaraokeSubmission) {
    return http.post<{ publicId: string; status: string }>("/public/karaoke/requests", input);
  }

  trackKaraokeRequest(publicId: string) {
    return http.get<KaraokePublicEntry>(
      `/public/karaoke/requests/${encodeURIComponent(publicId)}`,
    );
  }

  trackKaraokeRequests(publicIds: string[]) {
    return trackKaraokeInBatches(
      publicIds,
      (batch) => http.post<{ items: KaraokePublicEntry[]; missing: string[] }>(
        "/public/karaoke/requests/track",
        { publicIds: batch },
      ),
    );
  }

  getKaraokeQueue(eventSlug?: string) {
    const query = eventSlug ? `?event=${encodeURIComponent(eventSlug)}` : "";
    return http.get<{ items: KaraokePublicEntry[] }>(`/public/karaoke/queue${query}`);
  }

  getAdminKaraoke(status?: string, eventSlug?: string) {
    const search = new URLSearchParams();
    if (status) search.set("status", status);
    if (eventSlug) search.set("event", eventSlug);
    return http.get<{ items: KaraokeAdminEntry[]; events: { slug: string; title: string; startsAt: string | null }[] }>(
      `/admin/karaoke${search.size ? `?${search}` : ""}`,
    );
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

  startCheckout(postSlug: string, registrationPublicId: string) {
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
