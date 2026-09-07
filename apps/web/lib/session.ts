import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { decodeSessionToken, type SessionUser } from "./jwt";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "./session-constants";

/**
 * The API access token lives in an httpOnly cookie so page scripts (and anything injected into
 * them) can never read it. Every server render reads it here and forwards it to the API.
 */
export { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "./session-constants";

export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

export async function getSession(): Promise<SessionUser | null> {
  return decodeSessionToken(await getSessionToken());
}

export async function setSession(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

async function currentPath(): Promise<string> {
  const h = await headers();
  // Set by middleware so redirects can send the user back where they were headed.
  return h.get("x-rentora-pathname") ?? "/";
}

export async function requireStaff(): Promise<SessionUser> {
  const session = await getSession();
  if (session?.role !== "staff") {
    redirect(`/admin/login?next=${encodeURIComponent(await currentPath())}`);
  }
  return session;
}

export async function requirePlatform(): Promise<SessionUser> {
  const session = await getSession();
  if (session?.role !== "platform") {
    redirect(`/platform/login?next=${encodeURIComponent(await currentPath())}`);
  }
  return session;
}

export async function requireCustomer(): Promise<SessionUser> {
  const session = await getSession();
  if (session?.role !== "customer") {
    redirect(`/account/login?next=${encodeURIComponent(await currentPath())}`);
  }
  return session;
}

/** Staff seniority check for UI affordances. The API enforces the same rule server-side. */
export function canWrite(session: SessionUser | null): boolean {
  if (!session) return false;
  if (session.role === "platform") return true;
  if (session.role !== "staff") return false;
  return session.staffRole !== "READONLY";
}
