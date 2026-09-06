import { Injectable, NotFoundException } from "@nestjs/common";
import { PlanTier } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

const PLANS = [
  {
    tier: PlanTier.STARTER,
    name: "Starter",
    priceMinor: 4900,
    currency: "USD",
    envPrice: "STRIPE_PLATFORM_PRICE_STARTER",
  },
  {
    tier: PlanTier.GROWTH,
    name: "Growth",
    priceMinor: 14900,
    currency: "USD",
    envPrice: "STRIPE_PLATFORM_PRICE_GROWTH",
  },
  {
    tier: PlanTier.SCALE,
    name: "Scale",
    priceMinor: 39900,
    currency: "USD",
    envPrice: "STRIPE_PLATFORM_PRICE_SCALE",
  },
];

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  listPlans() {
    return PLANS.map((p) => ({
      tier: p.tier,
      name: p.name,
      priceMinor: p.priceMinor,
      currency: p.currency,
      stripePriceId: process.env[p.envPrice] ?? null,
    }));
  }

  async currentSubscription(tenantId?: string) {
    const tid = tenantId ?? requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tid } });
    if (!tenant) throw new NotFoundException("Tenant not found");
    return {
      plan: tenant.plan,
      stripeCustomerId: tenant.stripeCustomerId,
      stripeSubscriptionId: tenant.stripeSubscriptionId,
      connectOnboarded: tenant.connectOnboarded,
      stripeConnectAccountId: tenant.stripeConnectAccountId,
    };
  }

  async createSubscriptionStub(input: { plan: PlanTier; tenantId?: string }) {
    const tid = input.tenantId ?? requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tid } });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const priceEnv = PLANS.find((p) => p.tier === input.plan)?.envPrice;
    const priceId = priceEnv ? process.env[priceEnv] : undefined;

    if (!stripeKey || !priceId) {
      const stubSubId = `sub_stub_${tid.slice(0, 8)}_${input.plan.toLowerCase()}`;
      const stubCustId = tenant.stripeCustomerId ?? `cus_stub_${tid.slice(0, 8)}`;
      const updated = await this.prisma.tenant.update({
        where: { id: tid },
        data: {
          plan: input.plan,
          stripeCustomerId: stubCustId,
          stripeSubscriptionId: stubSubId,
        },
      });
      return {
        stub: true,
        subscriptionId: stubSubId,
        customerId: stubCustId,
        plan: updated.plan,
        message: "Stripe subscription stub (missing STRIPE_SECRET_KEY or price id)",
      };
    }

    // Minimal Stripe subscription create via REST
    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const custRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          "metadata[tenantId]": tid,
          name: tenant.name,
        }),
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
      }),
    });
    const sub = (await subRes.json()) as { id: string };

    await this.prisma.tenant.update({
      where: { id: tid },
      data: {
        plan: input.plan,
        stripeCustomerId: customerId,
        stripeSubscriptionId: sub.id,
      },
    });

    return { stub: false, subscriptionId: sub.id, customerId, plan: input.plan };
  }

  async cancelSubscriptionStub(tenantId?: string) {
    const tid = tenantId ?? requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tid } });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey && tenant.stripeSubscriptionId && !tenant.stripeSubscriptionId.startsWith("sub_stub_")) {
      await fetch(
        `https://api.stripe.com/v1/subscriptions/${tenant.stripeSubscriptionId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${stripeKey}` },
        },
      );
    }

    return this.prisma.tenant.update({
      where: { id: tid },
      data: { stripeSubscriptionId: null, plan: PlanTier.STARTER },
    });
  }

  async createConnectOnboardingLink(input: { returnUrl: string; refreshUrl: string }) {
    const tid = requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tid } });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      const accountId =
        tenant.stripeConnectAccountId ?? `acct_stub_${tid.slice(0, 10)}`;
      await this.prisma.tenant.update({
        where: { id: tid },
        data: {
          stripeConnectAccountId: accountId,
          connectOnboarded: true,
        },
      });
      return {
        stub: true,
        accountId,
        url: `${input.returnUrl}${input.returnUrl.includes("?") ? "&" : "?"}connect=stub_ready`,
        connectOnboarded: true,
        message: "Stripe Connect stub onboarded (STRIPE_SECRET_KEY not set)",
      };
    }

    let accountId = tenant.stripeConnectAccountId;
    if (!accountId) {
      const acctRes = await fetch("https://api.stripe.com/v1/accounts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          type: "express",
          "capabilities[card_payments][requested]": "true",
          "capabilities[transfers][requested]": "true",
          "metadata[tenantId]": tid,
        }),
      });
      if (!acctRes.ok) {
        throw new NotFoundException(`Stripe account create failed: ${await acctRes.text()}`);
      }
      const acct = (await acctRes.json()) as { id: string };
      accountId = acct.id;
      await this.prisma.tenant.update({
        where: { id: tid },
        data: { stripeConnectAccountId: accountId },
      });
    }

    const linkRes = await fetch("https://api.stripe.com/v1/account_links", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        account: accountId,
        refresh_url: input.refreshUrl,
        return_url: input.returnUrl,
        type: "account_onboarding",
      }),
    });
    if (!linkRes.ok) {
      throw new NotFoundException(`Stripe account link failed: ${await linkRes.text()}`);
    }
    const link = (await linkRes.json()) as { url: string };
    return {
      stub: false,
      accountId,
      url: link.url,
      connectOnboarded: tenant.connectOnboarded,
    };
  }

  async refreshConnectStatus() {
    const tid = requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tid } });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey || !tenant.stripeConnectAccountId) {
      return this.currentSubscription(tid);
    }

    if (tenant.stripeConnectAccountId.startsWith("acct_stub_")) {
      return this.currentSubscription(tid);
    }

    const res = await fetch(
      `https://api.stripe.com/v1/accounts/${tenant.stripeConnectAccountId}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } },
    );
    if (res.ok) {
      const acct = (await res.json()) as {
        charges_enabled?: boolean;
        details_submitted?: boolean;
      };
      const onboarded = Boolean(acct.charges_enabled && acct.details_submitted);
      if (onboarded !== tenant.connectOnboarded) {
        await this.prisma.tenant.update({
          where: { id: tid },
          data: { connectOnboarded: onboarded },
        });
      }
    }
    return this.currentSubscription(tid);
  }
}
