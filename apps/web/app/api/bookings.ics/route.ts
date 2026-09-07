import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api";
import { getSession, getSessionToken } from "@/lib/session";
import { getTenantSlug } from "@/lib/tenant";

/**
 * Proxies the staff ICS feed.
 *
 * Calendar clients cannot send an Authorization header, and the API refuses the feed without
 * one, so the browser-visible URL is this route and the token is attached server-side from the
 * httpOnly session cookie.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (session?.role !== "staff" && session?.role !== "platform") {
    return NextResponse.json({ error: "Sign in to download the calendar" }, { status: 401 });
  }

  const token = await getSessionToken();
  const tenantSlug = await getTenantSlug();
  const statusKey = new URL(request.url).searchParams.get("statusKey");

  const response = await fetch(
    `${getApiBaseUrl()}/bookings/calendar.ics${statusKey ? `?statusKey=${encodeURIComponent(statusKey)}` : ""}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(tenantSlug ? { "x-tenant-slug": tenantSlug } : {}),
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Could not build the calendar" }, { status: 502 });
  }

  return new NextResponse(await response.text(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="rentora-bookings.ics"',
      "Cache-Control": "no-store",
    },
  });
}
