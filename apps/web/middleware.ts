import { NextResponse, type NextRequest } from "next/server";

const PLATFORM_HOSTS = new Set([
  "admin.localhost",
  "admin.localhost:3000",
  "admin.rentora.app",
]);

function hostnameOf(hostHeader: string): string {
  return hostHeader.toLowerCase().split(":")[0] ?? hostHeader.toLowerCase();
}

function resolveTenantSlug(host: string, hostWithPort: string): string | null {
  if (PLATFORM_HOSTS.has(host) || PLATFORM_HOSTS.has(hostWithPort)) {
    return null;
  }

  // {slug}.localhost or {slug}.rentora.app
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

  // Custom domain / apex — no tenant slug from host (middleware leaves marketing)
  // Custom domains would be resolved via API later; for now treat non-apex as tenant candidate.
  const platformDomain = (process.env.PLATFORM_DOMAIN ?? "localhost:3000")
    .toLowerCase()
    .split(":")[0];

  if (host === platformDomain || host === "localhost" || host === "127.0.0.1" || host === "www.rentora.app" || host === "rentora.app") {
    return null;
  }

  // Unknown host → treat as custom tenant domain (slug placeholder = hostname label)
  return host.replace(/\./g, "-");
}

export function middleware(request: NextRequest) {
  const hostWithPort = request.headers.get("host") ?? "localhost:3000";
  const host = hostnameOf(hostWithPort);
  const { pathname } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);

  // Platform admin host
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

  const tenantSlug = resolveTenantSlug(host, hostWithPort);

  if (tenantSlug) {
    requestHeaders.set("x-tenant-slug", tenantSlug);
    requestHeaders.set("x-rentora-surface", "tenant");

    // Tenant storefront home lives at /home to avoid clashing with marketing `/`
    if (pathname === "/" || pathname === "") {
      const url = request.nextUrl.clone();
      url.pathname = "/home";
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Apex marketing
  requestHeaders.delete("x-tenant-slug");
  requestHeaders.set("x-rentora-surface", "marketing");
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
