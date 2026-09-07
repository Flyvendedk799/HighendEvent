"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "../api";
import { setSession } from "../session";
import { toActionState, type ActionState } from "./action-state";

export type SlugCheck = { slug: string; available: boolean; reason: string | null };

export async function checkSlugAction(slug: string): Promise<Partial<SlugCheck> & ActionState> {
  try {
    const result = await apiFetch<SlugCheck>(
      `/onboarding/check-slug?slug=${encodeURIComponent(slug)}`,
      { method: "GET", cache: "no-store" },
    );
    return { ok: true, ...result };
  } catch (err) {
    return toActionState(err);
  }
}

/**
 * Creates the tenant and signs the new owner in.
 *
 * Signup is anonymous by definition, so this goes through the plain API client rather than the
 * tenant-scoped server client — there is no tenant yet to scope to.
 */
export async function signUpAction(input: {
  tenantName: string;
  storeName: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  currency: string;
  country: string;
}): Promise<ActionState> {
  let result: { accessToken: string; tenant: { slug: string } };

  try {
    result = await apiFetch<{ accessToken: string; tenant: { slug: string } }>("/onboarding", {
      method: "POST",
      body: input,
    });
  } catch (err) {
    return toActionState(err);
  }

  await setSession(result.accessToken);
  redirect("/admin/go-live?welcome=1");
}
