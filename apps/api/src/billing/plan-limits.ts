import { PlanTier } from "@prisma/client";

export type PlanLimits = {
  tier: PlanTier;
  name: string;
  priceMinor: number;
  currency: string;
  envPrice: string;
  /** null means unlimited. */
  maxProducts: number | null;
  maxStaff: number | null;
  customDomains: boolean;
  apiAccess: boolean;
  applicationFeeBps: number;
};

/**
 * What each plan is allowed to do. Enforced server-side on the routes that create the limited
 * resource — a limit checked only in the UI is not a limit.
 */
export const PLANS: PlanLimits[] = [
  {
    tier: PlanTier.STARTER,
    name: "Starter",
    priceMinor: 4900,
    currency: "USD",
    envPrice: "STRIPE_PLATFORM_PRICE_STARTER",
    maxProducts: 25,
    maxStaff: 2,
    customDomains: false,
    apiAccess: false,
    applicationFeeBps: 250,
  },
  {
    tier: PlanTier.GROWTH,
    name: "Growth",
    priceMinor: 14900,
    currency: "USD",
    envPrice: "STRIPE_PLATFORM_PRICE_GROWTH",
    maxProducts: 250,
    maxStaff: 10,
    customDomains: true,
    apiAccess: false,
    applicationFeeBps: 150,
  },
  {
    tier: PlanTier.SCALE,
    name: "Scale",
    priceMinor: 39900,
    currency: "USD",
    envPrice: "STRIPE_PLATFORM_PRICE_SCALE",
    maxProducts: null,
    maxStaff: null,
    customDomains: true,
    apiAccess: true,
    applicationFeeBps: 50,
  },
];

export function planLimits(tier: PlanTier): PlanLimits {
  return PLANS.find((plan) => plan.tier === tier) ?? PLANS[0]!;
}
