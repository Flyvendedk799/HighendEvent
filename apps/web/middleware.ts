import { NextResponse, type NextRequest } from "next/server";

const PLATFORM_HOSTS = new Set([
  "admin.localhost",
  "admin.localhost:3000",
  "admin.rentora.app",
]);

const SESSION_COOKIE = "rentora_session";

function hostnameOf(hostHeader: string): string {
  return hostHeader.toLowerCase().split(":")[0] ?? hostHeader.toLowerCase();
}

async function resolveTenantSlug(host: string, hostWithPort: string): Promise<string | null> {
  if (PLATFORM_HOSTS.has(host) || PLATFORM_HOSTS.has(hostWithPort)) {
    return null;
  }

  const localhostMatch = host.match(/^([a-z0-9-]+)\.localhost$/);
  if (localhostMatch && localhostMatch[1] !== "www" && localhostMatch[1] !== "admin") {
    return localhostMatch[1];
  }

  const rentoraMatch = host.match(/^([a-z0-9-]+)\.rentora\.app$/);
  if (
    rentoraMatch &&
    rentoraMatch[1] !== "www" &&
    rentoraMatch[1] !== "admin" &&
    rentoraMatch[1] !== "app"
  ) {
    return rentoraMatch[1];
  }

  const platformDomain = (process.env.PLATFORM_DOMAIN ?? "localhost:3000")
    .toLowerCase()
    .split(":")[0];

  if (
    host === platformDomain ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "www.rentora.app" ||
    host === "rentora.app"
  ) {
    return null;
  }

  // Custom domain: ask API for verified hostname → tenant slug
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const res = await fetch(`${apiUrl}/public/resolve-host?host=${encodeURIComponent(host)}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = (await res.json()) as { slug?: string | null; status?: string };
      if (data.slug && data.status !== "missing") return data.slug;
    }
  } catch {
    // fall through
  }

  return null;
}

function redirectToLogin(request: NextRequest, loginPath: string) {
  const url = request.nextUrl.clone();
  url.pathname = loginPath;
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const hostWithPort = request.headers.get("host") ?? "localhost:3000";
  const host = hostnameOf(hostWithPort);
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  // Auth gates (cookie presence only; validity checked by pages/API)
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login") && !hasSession) {
    return redirectToLogin(request, "/admin/login");
  }
  if (
    pathname.startsWith("/platform") &&
    !pathname.startsWith("/platform/login") &&
    !hasSession
  ) {
    return redirectToLogin(request, "/platform/login");
  }
  if (
    pathname.startsWith("/account") &&
    !pathname.startsWith("/account/login") &&
    !pathname.startsWith("/account/register") &&
    !hasSession
  ) {
    return redirectToLogin(request, "/account/login");
  }

  if (PLATFORM_HOSTS.has(host) || PLATFORM_HOSTS.has(hostWithPort)) {
    requestHeaders.delete("x-tenant-slug");
    requestHeaders.set("x-rentora-surface", "platform");

    if (pathname === "/" || pathname === "") {
      const url = request.nextUrl.clone();
      url.pathname = "/platform";
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    if (!pathname.startsWith("/platform")) {
      const url = request.nextUrl.clone();
      url.pathname = `/platform${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const tenantSlug = await resolveTenantSlug(host, hostWithPort);

  if (tenantSlug) {
    requestHeaders.set("x-tenant-slug", tenantSlug);
    requestHeaders.set("x-rentora-surface", "tenant");

    if (pathname === "/" || pathname === "") {
      const url = request.nextUrl.clone();
      url.pathname = "/home";
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  requestHeaders.delete("x-tenant-slug");
  requestHeaders.set("x-rentora-surface", "marketing");
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
