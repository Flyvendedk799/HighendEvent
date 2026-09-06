import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/api";

/** Establish an httpOnly session cookie from a JWT (e.g. platform impersonation). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    accessToken?: string;
    maxAgeSeconds?: number;
  };

  if (!body.accessToken || typeof body.accessToken !== "string") {
    return NextResponse.json({ message: "accessToken is required" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, body.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: body.maxAgeSeconds ?? 60 * 60,
  });
  return response;
}
