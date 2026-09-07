import { NextResponse, type NextRequest } from "next/server";
import { decodeSessionToken } from "@/lib/jwt";
import { SESSION_COOKIE } from "@/lib/session-constants";

const RESERVED_SUBDOMAINS = new Set(["www", "admin", "app", "api", "cdn"]);

/** Routes inside a guarded area that must stay reachable while logged out. */
const PUBLIC_PATHS = [
  "/admin/login",
  "/platform/login",
  "/account/login",
  "/account/register",
];

function hostnameOf(hostHeader: string): string {
  return hostHeader.toLowerCase().split(":")[0] ?? hostHeader.toLowerCase();
}

function platformDomain(): string {
  return (process.env.PLATFORM_DOMAIN ?? "localhost:3000").toLowerCase().split(":")[0]!;
}

/**
 * The superadmin console lives at `admin.<platform domain>`. It has to follow PLATFORM_DOMAIN
 * rather than being hardcoded: `admin` is a reserved subdomain, so a tenant can never claim it,
 * and pinning it to one brand would silently strand the console when the platform is rebranded.
 * `admin.localhost` stays reachable so the console is testable in dev.
 */
function isPlatformHost(host: string): boolean {
  return host === "admin.localhost" || host === `admin.${platformDomain()}`;
}

type Surface =
  | { kind: "platform" }
  | { kind: "marketing" }
  | { kind: "tenant"; slug: string }
  | { kind: "tenant-domain"; hostname: string };

function resolveSurface(host: string): Surface {
  if (isPlatformHost(host)) {
    return { kind: "platform" };
  }

  const apex = platformDomain();

  if (host === apex || host === "localhost" || host === "127.0.0.1" || host === `www.${apex}`) {
    return { kind: "marketing" };
  }

  if (host.endsWith(`.${apex}`)) {
    const sub = host.slice(0, -(apex.length + 1));
    if (sub && !sub.includes(".") && !RESERVED_SUBDOMAINS.has(sub)) {
      return { kind: "tenant", slug: sub };
    }
    return { kind: "marketing" };
  }

  // Anything else is a candidate custom domain. The API resolves it against the CustomDomain
  // table — the edge cannot, and guessing a slug from the hostname would be a lie.
  return { kind: "tenant-domain", hostname: host };
}

function guardFor(pathname: string): "staff" | "platform" | "customer" | null {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "staff";
  if (pathname === "/platform" || pathname.startsWith("/platform/")) return "platform";
  if (pathname === "/account" || pathname.startsWith("/account/")) return "customer";
  return null;
}

export function middleware(request: NextRequest) {
  const hostWithPort = request.headers.get("host") ?? "localhost:3000";
  const host = hostnameOf(hostWithPort);
  const { pathname } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-rentora-pathname", pathname);
  requestHeaders.delete("x-tenant-slug");
  requestHeaders.delete("x-rentora-host");

  const surface = resolveSurface(host);
  requestHeaders.set("x-rentora-surface", surface.kind === "platform" ? "platform" : surface.kind);

  if (surface.kind === "tenant") {
    requestHeaders.set("x-tenant-slug", surface.slug);
  } else if (surface.kind === "tenant-domain") {
    requestHeaders.set("x-rentora-host", host);
  }

  // Auth gate. The token signature is verified by the API on every call; this check only decides
  // whether to render a guarded page or bounce to the right login.
  const guard = guardFor(pathname);
  if (guard) {
    const session = decodeSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (session?.role !== guard) {
      const loginPath =
        guard === "staff"
          ? "/admin/login"
          : guard === "platform"
            ? "/platform/login"
            : "/account/login";
      const url = request.nextUrl.clone();
      url.pathname = loginPath;
      url.search = "";
      url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
  }

  if (surface.kind === "platform") {
    if (pathname === "/" || pathname === "") {
      const url = request.nextUrl.clone();
      url.pathname = "/platform";
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
    if (!pathname.startsWith("/platform")) {
      const url = request.nextUrl.clone();
      url.pathname = `/platform${pathname}`;
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (surface.kind === "tenant" || surface.kind === "tenant-domain") {
    // The tenant storefront home lives at /home so it does not clash with marketing at /.
    if (pathname === "/" || pathname === "") {
      const url = request.nextUrl.clone();
      url.pathname = "/home";
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
