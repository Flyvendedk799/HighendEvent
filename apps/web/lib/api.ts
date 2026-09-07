const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:4000";

export type ApiError = {
  status: number;
  message: string;
  body?: unknown;
};

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    typeof (value as ApiError).status === "number" &&
    "message" in value
  );
}

export type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  tenantSlug?: string | null;
  token?: string | null;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
  /** Return null instead of throwing when the API answers 404. */
  nullOn404?: boolean;
};

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function messageFrom(body: unknown, status: number): string {
  if (typeof body === "object" && body && "message" in body) {
    const message = (body as { message: unknown }).message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  if (typeof body === "string" && body.trim()) return body;
  return `API request failed (${status})`;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.tenantSlug) {
    headers["x-tenant-slug"] = options.tenantSlug;
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: options.cache,
    next: options.next,
  });

  const body = await parseBody(response);

  if (!response.ok) {
    if (response.status === 404 && options.nullOn404) {
      return null as T;
    }
    const error: ApiError = {
      status: response.status,
      message: messageFrom(body, response.status),
      body,
    };
    throw error;
  }

  return body as T;
}

export function getApiBaseUrl(): string {
  return API_URL;
}

export const api = {
  get: <T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};
