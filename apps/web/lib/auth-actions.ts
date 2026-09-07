"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch, isApiError } from "./api";
import { clearSession, setSession } from "./session";
import type { LoginResponse } from "./types";

export type AuthFormState = { error?: string };

function safeNext(value: FormDataEntryValue | null, fallback: string): string {
  const next = typeof value === "string" ? value : "";
  // Only same-origin paths — never bounce a login through an attacker-supplied absolute URL.
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

async function tenantSlugFromRequest(explicit?: FormDataEntryValue | null): Promise<string | null> {
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim().toLowerCase();
  const h = await headers();
  return h.get("x-tenant-slug");
}

async function login(
  role: "staff" | "platform" | "customer",
  formData: FormData,
  fallbackNext: string,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const tenantSlug = role === "platform" ? null : await tenantSlugFromRequest(formData.get("tenantSlug"));

  if (role !== "platform" && !tenantSlug) {
    return { error: "Enter your store address so we know which store to sign you in to." };
  }

  try {
    const result = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: { email, password, role, tenantSlug: tenantSlug ?? undefined },
      tenantSlug,
    });
    await setSession(result.accessToken);
  } catch (err) {
    if (isApiError(err)) {
      return {
        error:
          err.status === 401
            ? "Those credentials did not match an active account."
            : err.message,
      };
    }
    return { error: "Could not reach the alarent API. Is it running?" };
  }

  redirect(safeNext(formData.get("next"), fallbackNext));
}

export async function staffLoginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  return login("staff", formData, "/admin");
}

export async function platformLoginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  return login("platform", formData, "/platform");
}

export async function customerLoginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  return login("customer", formData, "/account/dashboard");
}

export async function customerRegisterAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!email || !firstName || !lastName) {
    return { error: "Name and email are required." };
  }
  if (password.length < 8) {
    return { error: "Choose a password of at least 8 characters." };
  }

  const tenantSlug = await tenantSlugFromRequest(null);
  if (!tenantSlug) {
    return { error: "Accounts belong to a specific store. Open the store address to register." };
  }

  try {
    const result = await apiFetch<LoginResponse>("/auth/register", {
      method: "POST",
      body: { email, password, firstName, lastName, phone: phone || undefined },
      tenantSlug,
    });
    await setSession(result.accessToken);
  } catch (err) {
    if (isApiError(err)) {
      return {
        error:
          err.status === 409
            ? "That email already has an account. Log in instead."
            : err.message,
      };
    }
    return { error: "Could not reach the alarent API. Is it running?" };
  }

  redirect(safeNext(formData.get("next"), "/account/dashboard"));
}

export async function logoutAction(formData?: FormData): Promise<void> {
  await clearSession();
  redirect(safeNext(formData?.get("next") ?? null, "/"));
}
