import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/api";

type LoginBody = {
  email?: string;
  password?: string;
  role?: "platform" | "staff" | "customer";
  tenantSlug?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as LoginBody;
  if (!body.email || !body.password || !body.role) {
    return NextResponse.json({ message: "email, password, and role are required" }, { status: 400 });
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const upstream = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      email: body.email,
      password: body.password,
      role: body.role,
      tenantSlug: body.tenantSlug,
    }),
  });

  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const message = Array.isArray(payload?.message)
      ? payload.message.join(", ")
      : (payload?.message ?? "Login failed");
    return NextResponse.json({ message }, { status: upstream.status });
  }

  const token = payload.accessToken as string | undefined;
  if (!token) {
    return NextResponse.json({ message: "No access token returned" }, { status: 502 });
  }

  const response = NextResponse.json({ user: payload.user });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
