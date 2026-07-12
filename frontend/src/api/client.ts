import type { ApiErrorPayload } from "./types";

export class ApiError extends Error {
  code: string;
  status: number;
  fields: Record<string, string>;
  details: Record<string, unknown>;
  retryAfter: number | null;

  constructor(status: number, payload: ApiErrorPayload["error"] | null, retryAfter: number | null = null) {
    super(payload?.message ?? `Request failed (${status})`);
    this.status = status;
    this.code = payload?.code ?? "request_failed";
    this.details = payload?.details ?? {};
    this.fields = (payload?.details?.fields as Record<string, string>) ?? {};
    this.retryAfter = retryAfter;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.method && init.method !== "GET") {
    // Custom header doubles as CSRF protection; see backend app/api docs.
    headers.set("X-INCAS-Api", "1");
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`/api/v1${path}`, {
    credentials: "same-origin",
    ...init,
    headers,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const retryAfter = Number.parseInt(response.headers.get("Retry-After") ?? "", 10);
    throw new ApiError(
      response.status,
      (body as ApiErrorPayload | null)?.error ?? null,
      Number.isFinite(retryAfter) ? retryAfter : null,
    );
  }
  return body as T;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data ?? {}) }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(data ?? {}) }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
