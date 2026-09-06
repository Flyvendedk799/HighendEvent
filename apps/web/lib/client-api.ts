"use client";

const DEFAULT_TENANT = "demo";

export function getClientTenantSlug(): string {
  if (typeof document === "undefined") return DEFAULT_TENANT;
  const meta = document.querySelector('meta[name="x-tenant-slug"]');
  const fromMeta = meta?.getAttribute("content")?.trim();
  if (fromMeta) return fromMeta;
  const host = window.location.hostname.toLowerCase();
  const match = host.match(/^([a-z0-9-]+)\.localhost$/);
  if (match?.[1] && match[1] !== "www" && match[1] !== "admin") {
    return match[1];
  }
  return DEFAULT_TENANT;
}

type ClientApiInit = RequestInit & { tenantSlug?: string };

export async function clientApi<T = unknown>(
  path: string,
  init: ClientApiInit = {},
): Promise<T> {
  const { tenantSlug, ...rest } = init;
  const headers = new Headers(rest.headers);
  headers.set("Accept", "application/json");
  if (rest.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("x-tenant-slug", tenantSlug ?? getClientTenantSlug());

  const res = await fetch(`/api/proxy${path.startsWith("/") ? path : `/${path}`}`, {
    ...rest,
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      typeof data === "object" && data && "message" in data
        ? Array.isArray((data as { message: unknown }).message)
          ? (data as { message: string[] }).message.join(", ")
          : String((data as { message: unknown }).message)
        : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}
