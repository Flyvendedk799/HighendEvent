import "server-only";
import { isApiError } from "../api";
import { getSession } from "../session";

export type ActionState = {
  ok?: boolean;
  error?: string;
  /** Field-level messages keyed by input name, so forms can highlight the offending control. */
  fieldErrors?: Record<string, string>;
  /** Populated by create actions so the caller can navigate to the new record. */
  id?: string;
};

export const IDLE: ActionState = {};

/**
 * Turns whatever an action threw into something a form can render.
 *
 * Next redirects by throwing, so those have to pass straight through — swallowing them would
 * silently break every redirect-after-submit.
 */
export function toActionState(err: unknown): ActionState {
  if (isRedirectError(err)) throw err;

  if (isApiError(err)) {
    if (err.status === 401) {
      return { error: "Your session expired. Reload the page and sign in again." };
    }
    if (err.status === 403) {
      return { error: "Your role does not allow this change." };
    }
    return { error: err.message };
  }

  if (err instanceof Error) return { error: err.message };
  return { error: "Something went wrong. Try again." };
}

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest: unknown }).digest === "string" &&
    ((err as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (err as { digest: string }).digest === "NEXT_NOT_FOUND")
  );
}

/** Rejects a write from a READONLY staff account before it reaches the API. */
export async function assertCanWrite(): Promise<ActionState | null> {
  const session = await getSession();
  if (session?.role === "staff" && session.staffRole === "READONLY") {
    return { error: "Your account has read-only access." };
  }
  return null;
}

// ------------------------------------------------------------------ form parsing

export function str(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export function optionalStr(formData: FormData, name: string): string | undefined {
  const value = str(formData, name);
  return value === "" ? undefined : value;
}

export function bool(formData: FormData, name: string): boolean {
  const value = formData.get(name);
  return value === "on" || value === "true" || value === "1";
}

export function int(formData: FormData, name: string, fallback = 0): number {
  const raw = str(formData, name);
  if (raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

export function optionalInt(formData: FormData, name: string): number | undefined {
  const raw = str(formData, name);
  if (raw === "") return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
}

/** Money arrives as a major-unit decimal ("2500.50") and is stored in minor units. */
export function moneyMinor(formData: FormData, name: string, fallback = 0): number {
  const raw = str(formData, name).replace(/\s/g, "").replace(",", ".");
  if (raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : fallback;
}

export function optionalMoneyMinor(formData: FormData, name: string): number | undefined {
  const raw = str(formData, name);
  if (raw === "") return undefined;
  return moneyMinor(formData, name);
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
