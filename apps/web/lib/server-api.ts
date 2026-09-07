import "server-only";
import { headers } from "next/headers";
import { apiFetch, type ApiRequestOptions } from "./api";
import { getSessionToken } from "./session";

/**
 * The one way server components and server actions talk to the API.
 *
 * It attaches the tenant (from middleware) and the caller token (from the httpOnly cookie), so
 * no call site has to remember either — and no call site can accidentally omit the tenant and
 * read across tenants.
 */
export async function serverApi<T = unknown>(
  path: string,
  options: Omit<ApiRequestOptions, "token" | "tenantSlug"> & {
    tenantSlug?: string | null;
    /** Send the request unauthenticated even if a session cookie exists. */
    anonymous?: boolean;
  } = {},
): Promise<T> {
  const { anonymous, tenantSlug, headers: extraHeaders, ...rest } = options;
  const h = await headers();

  // A custom domain cannot be resolved at the edge, so the browser-facing hostname travels to
  // the API, which looks it up in the CustomDomain table.
  const tenantHost = h.get("x-rentora-host");

  return apiFetch<T>(path, {
    ...rest,
    headers: tenantHost ? { "x-tenant-host": tenantHost, ...extraHeaders } : extraHeaders,
    tenantSlug: tenantSlug === undefined ? h.get("x-tenant-slug") : tenantSlug,
    token: anonymous ? undefined : await getSessionToken(),
  });
}

/** Reads a resource, returning null when it does not exist rather than throwing. */
export async function serverApiOrNull<T = unknown>(
  path: string,
  options: Parameters<typeof serverApi>[1] = {},
): Promise<T | null> {
  return serverApi<T | null>(path, { ...options, nullOn404: true });
}

export const serverGet = <T>(path: string, options?: Parameters<typeof serverApi>[1]) =>
  serverApi<T>(path, { ...options, method: "GET" });

export const serverPost = <T>(
  path: string,
  body?: unknown,
  options?: Parameters<typeof serverApi>[1],
) => serverApi<T>(path, { ...options, method: "POST", body });

export const serverPatch = <T>(
  path: string,
  body?: unknown,
  options?: Parameters<typeof serverApi>[1],
) => serverApi<T>(path, { ...options, method: "PATCH", body });

export const serverPut = <T>(
  path: string,
  body?: unknown,
  options?: Parameters<typeof serverApi>[1],
) => serverApi<T>(path, { ...options, method: "PUT", body });

export const serverDelete = <T>(path: string, options?: Parameters<typeof serverApi>[1]) =>
  serverApi<T>(path, { ...options, method: "DELETE" });
