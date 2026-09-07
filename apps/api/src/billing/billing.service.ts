import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PlanTier } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";
import { PLANS, planLimits, type PlanLimits } from "./plan-limits";

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  listPlans() {
    return PLANS.map((plan) => ({
      tier: plan.tier,
      name: plan.name,
      priceMinor: plan.priceMinor,
      currency: plan.currency,
      maxProducts: plan.maxProducts,
      maxStaff: plan.maxStaff,
      customDomains: plan.customDomains,
      apiAccess: plan.apiAccess,
      applicationFeeBps: plan.applicationFeeBps,
      stripePriceId: process.env[plan.envPrice] ?? null,
    }));
  }

  async currentSubscription(tenantId?: string) {
    const tid = tenantId ?? requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tid } });
    if (!tenant) throw new NotFoundException("Tenant not found");

    return {
      plan: tenant.plan,
      limits: planLimits(tenant.plan),
      stripeCustomerId: tenant.stripeCustomerId,
      stripeSubscriptionId: tenant.stripeSubscriptionId,
      connectOnboarded: tenant.connectOnboarded,
      stripeConnectAccountId: tenant.stripeConnectAccountId,
      applicationFeeBps: tenant.applicationFeeBps,
    };
  }

  /** Current usage against the plan, for the settings screen and the upgrade prompts. */
  async planUsage(tenantId?: string) {
    const tid = tenantId ?? requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tid } });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const limits = planLimits(tenant.plan);

    const [products, staff, domains] = await Promise.all([
      this.prisma.product.count({ where: { tenantId: tid, isActive: true } }),
      this.prisma.staffUser.count({ where: { tenantId: tid, isActive: true } }),
      this.prisma.customDomain.count({ where: { tenantId: tid } }),
    ]);

    return {
      plan: tenant.plan,
      limits,
      usage: { products, staff, domains },
      atProductLimit: limits.maxProducts !== null && products >= limits.maxProducts,
      atStaffLimit: limits.maxStaff !== null && staff >= limits.maxStaff,
    };
  }

  /**
   * Throws when the tenant is already at the plan ceiling for a resource.
   * Called by the routes that create products, staff, and domains.
   */
  async assertWithinLimit(resource: "products" | "staff" | "domains", tenantId?: string) {
    const tid = tenantId ?? requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tid } });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const limits = planLimits(tenant.plan);

    if (resource === "products" && limits.maxProducts !== null) {
      const count = await this.prisma.product.count({ where: { tenantId: tid, isActive: true } });
      if (count >= limits.maxProducts) {
        throw new ForbiddenException(
          `The ${limits.name} plan includes ${limits.maxProducts} published products. Upgrade to add more.`,
        );
      }
    }

    if (resource === "staff" && limits.maxStaff !== null) {
      const count = await this.prisma.staffUser.count({
        where: { tenantId: tid, isActive: true },
      });
      if (count >= limits.maxStaff) {
        throw new ForbiddenException(
          `The ${limits.name} plan includes ${limits.maxStaff} staff seats. Upgrade to add more.`,
        );
      }
    }

    if (resource === "domains" && !limits.customDomains) {
      throw new ForbiddenException(
        `Custom domains are available on Growth and Scale. The ${limits.name} plan uses a rentora.app subdomain.`,
      );
    }
  }

  async featureEnabled(feature: keyof PlanLimits, tenantId?: string): Promise<boolean> {
    const tid = tenantId ?? requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tid } });
    if (!tenant) return false;
    return Boolean(planLimits(tenant.plan)[feature]);
  }

  async createSubscriptionStub(input: { plan: PlanTier; tenantId?: string }) {
    const tid = input.tenantId ?? requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tid } });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const limits = planLimits(input.plan);
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env[limits.envPrice];

    if (!stripeKey || stripeKey.startsWith("sk_test_xxx") || !priceId) {
      const stubSubId = `sub_stub_${tid.slice(0, 8)}_${input.plan.toLowerCase()}`;
      const stubCustId = tenant.stripeCustomerId ?? `cus_stub_${tid.slice(0, 8)}`;
      const updated = await this.prisma.tenant.update({
        where: { id: tid },
        data: {
          plan: input.plan,
          stripeCustomerId: stubCustId,
          stripeSubscriptionId: stubSubId,
          applicationFeeBps: limits.applicationFeeBps,
        },
      });
      return {
        stub: true,
        subscriptionId: stubSubId,
        customerId: stubCustId,
        plan: updated.plan,
        message:
          "Plan changed without billing: Stripe is not configured on this deployment.",
      };
    }

    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const custRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ "metadata[tenantId]": tid, name: tenant.name }),
      });
      const cust = (await custRes.json()) as { id: string };
      customerId = cust.id;
    }

    const subRes = await fetch("https://api.stripe.com/v1/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: customerId,
        "items[0][price]": priceId,
        "metadata[tenantId]": tid,
      }),
    });
    const sub = (await subRes.json()) as { id: string };

    await this.prisma.tenant.update({
      where: { id: tid },
      data: {
        plan: input.plan,
        stripeCustomerId: customerId,
        stripeSubscriptionId: sub.id,
        applicationFeeBps: limits.applicationFeeBps,
      },
    });

    return { stub: false, subscriptionId: sub.id, customerId, plan: input.plan };
  }

  async cancelSubscriptionStub(tenantId?: string) {
    const tid = tenantId ?? requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tid } });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (
      stripeKey &&
      !stripeKey.startsWith("sk_test_xxx") &&
      tenant.stripeSubscriptionId &&
      !tenant.stripeSubscriptionId.startsWith("sub_stub_")
    ) {
      await fetch(`https://api.stripe.com/v1/subscriptions/${tenant.stripeSubscriptionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
    }

    return this.prisma.tenant.update({
      where: { id: tid },
      data: {
        stripeSubscriptionId: null,
        plan: PlanTier.STARTER,
        applicationFeeBps: planLimits(PlanTier.STARTER).applicationFeeBps,
      },
    });
  }
}
