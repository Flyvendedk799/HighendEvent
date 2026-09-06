export type PlanTierName = "STARTER" | "GROWTH" | "SCALE";

export type PlanLimits = {
  maxProducts: number | null;
  maxStaff: number | null;
  customDomains: boolean;
  maxCustomDomains: number | null;
};

export const PLAN_LIMITS: Record<PlanTierName, PlanLimits> = {
  STARTER: {
    maxProducts: 50,
    maxStaff: 3,
    customDomains: false,
    maxCustomDomains: 0,
  },
  GROWTH: {
    maxProducts: 500,
    maxStaff: 15,
    customDomains: true,
    maxCustomDomains: 3,
  },
  SCALE: {
    maxProducts: null,
    maxStaff: null,
    customDomains: true,
    maxCustomDomains: null,
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  if (plan in PLAN_LIMITS) return PLAN_LIMITS[plan as PlanTierName];
  return PLAN_LIMITS.STARTER;
}

export function withinLimit(current: number, max: number | null): boolean {
  if (max === null) return true;
  return current < max;
}
