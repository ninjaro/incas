import type { ApiErrorPayload } from "./types";

export class ApiError extends Error {
  code: string;
  status: number;
  fields: Record<string, string>;
  details: Record<string, unknown>;

  constructor(status: number, payload: ApiErrorPayload["error"] | null) {
    super(payload?.message ?? `Request failed (${status})`);
    this.status = status;
    this.code = payload?.code ?? "request_failed";
    this.details = payload?.details ?? {};
    this.fields = (payload?.details?.fields as Record<string, string>) ?? {};
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
    throw new ApiError(response.status, (body as ApiErrorPayload | null)?.error ?? null);
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
