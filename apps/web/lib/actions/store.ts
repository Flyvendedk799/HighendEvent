"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { serverGet, serverPatch, serverPost } from "../server-api";
import {
  assertCanWrite,
  bool,
  int,
  optionalStr,
  str,
  toActionState,
  type ActionState,
} from "./action-state";

function revalidateStorefront() {
  // The storefront layout caches the bootstrap by tag, so branding changes show immediately.
  revalidateTag("storefront-bootstrap");
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/theme");
  revalidatePath("/admin/go-live");
}

export type StoreSettings = {
  id: string;
  name: string;
  tagline: string | null;
  localeDefault: string;
  locales: string[];
  currency: string;
  timezone: string;
  country: string;
  taxMode: "INCLUSIVE" | "EXCLUSIVE";
  taxPercentBps: number;
  paymentModel: "FULL_UPFRONT" | "DEPOSIT_REMAINDER";
  depositPercentBps: number;
  logoUrl: string | null;
  faviconUrl: string | null;
  brandColors: Record<string, string>;
  fonts: Record<string, string>;
  supportEmail: string | null;
  supportPhone: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  theme: { id: string; name: string; tokens: Record<string, string> } | null;
};

export type GoLiveChecklist = {
  items: Array<{
    key: string;
    label: string;
    done: boolean;
    href: string;
    detail: string;
    required: boolean;
  }>;
  readyToLaunch: boolean;
  completed: number;
  total: number;
  storefrontUrl: string;
};

export async function getStoreSettings(): Promise<StoreSettings> {
  return serverGet<StoreSettings>("/store", { cache: "no-store" });
}

export async function getGoLiveChecklist(): Promise<GoLiveChecklist> {
  return serverGet<GoLiveChecklist>("/store/go-live", { cache: "no-store" });
}

export async function updateStoreSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  const payload = {
    name: str(formData, "name"),
    tagline: optionalStr(formData, "tagline") ?? "",
    supportEmail: optionalStr(formData, "supportEmail") ?? "",
    supportPhone: optionalStr(formData, "supportPhone") ?? "",
    currency: str(formData, "currency"),
    country: str(formData, "country"),
    timezone: str(formData, "timezone"),
    localeDefault: str(formData, "localeDefault"),
    taxMode: str(formData, "taxMode") === "EXCLUSIVE" ? "EXCLUSIVE" : "INCLUSIVE",
    // The form takes whole percentages; the API stores basis points.
    taxPercentBps: Math.round(Number(str(formData, "taxPercent") || 0) * 100),
    paymentModel:
      str(formData, "paymentModel") === "DEPOSIT_REMAINDER"
        ? "DEPOSIT_REMAINDER"
        : "FULL_UPFRONT",
    depositPercentBps: Math.round(Number(str(formData, "depositPercent") || 0) * 100),
    seoTitle: optionalStr(formData, "seoTitle") ?? "",
    seoDescription: optionalStr(formData, "seoDescription") ?? "",
  };

  if (!payload.name) {
    return { error: "Your store needs a name.", fieldErrors: { name: "Required" } };
  }

  try {
    await serverPatch("/store", payload);
  } catch (err) {
    return toActionState(err);
  }

  revalidateStorefront();
  return { ok: true };
}

export async function updateThemeAction(input: {
  name?: string;
  tokens: Record<string, string>;
  logoUrl?: string | null;
  faviconUrl?: string | null;
}): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverPatch("/store/theme", { name: input.name, tokens: input.tokens });

    if (input.logoUrl !== undefined || input.faviconUrl !== undefined) {
      await serverPatch("/store", {
        logoUrl: input.logoUrl ?? "",
        faviconUrl: input.faviconUrl ?? "",
        brandColors: input.tokens,
      });
    } else {
      await serverPatch("/store", { brandColors: input.tokens });
    }
  } catch (err) {
    return toActionState(err);
  }

  revalidateStorefront();
  return { ok: true };
}

// ------------------------------------------------------------------- Connect

export type ConnectStatus = {
  stripeConfigured: boolean;
  accountId: string | null;
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsDue: string[];
  disabledReason: string | null;
};

export async function getConnectStatus(): Promise<ConnectStatus | null> {
  return serverGet<ConnectStatus>("/billing/connect/status", { cache: "no-store" }).catch(
    () => null,
  );
}

export async function startConnectOnboardingAction(): Promise<{ url?: string } & ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = `${proto}://${host}`;

  try {
    const link = await serverPost<{ url: string }>("/billing/connect/onboarding-link", {
      refreshUrl: `${base}/admin/settings?connect=refresh`,
      returnUrl: `${base}/admin/settings?connect=done`,
    });
    return { ok: true, url: link.url };
  } catch (err) {
    return toActionState(err);
  }
}

export async function openConnectDashboardAction(): Promise<{ url?: string } & ActionState> {
  try {
    const link = await serverPost<{ url: string }>("/billing/connect/dashboard-link");
    return { ok: true, url: link.url };
  } catch (err) {
    return toActionState(err);
  }
}
