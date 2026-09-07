import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

type StripeAccount = {
  id: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  requirements?: { currently_due?: string[]; disabled_reason?: string | null };
};

/**
 * Stripe Connect Express onboarding.
 *
 * Rentora takes payment on behalf of each tenant using destination charges, so a tenant cannot
 * accept real money until their Connect account can take charges. The go-live checklist reads
 * `connectOnboarded`, which is only ever set from Stripe's own answer — never from the tenant
 * clicking through the flow.
 */
@Injectable()
export class ConnectService {
  constructor(private readonly prisma: PrismaService) {}

  private stripeKey(): string {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || key.startsWith("sk_test_xxx")) {
      throw new BadRequestException(
        "Stripe is not configured on this deployment. Set STRIPE_SECRET_KEY to connect payouts.",
      );
    }
    return key;
  }

  private async stripe<T>(path: string, body?: URLSearchParams): Promise<T> {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${this.stripeKey()}`,
        ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      body,
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new BadRequestException(`Stripe: ${detail.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }

  /** Current payout readiness, refreshed from Stripe when an account exists. */
  async status() {
    const tenantId = requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const configured = Boolean(
      process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith("sk_test_xxx"),
    );

    if (!tenant.stripeConnectAccountId || !configured) {
      return {
        stripeConfigured: configured,
        accountId: tenant.stripeConnectAccountId,
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        requirementsDue: [] as string[],
        disabledReason: configured ? null : "Stripe is not configured on this deployment",
      };
    }

    const account = await this.stripe<StripeAccount>(
      `accounts/${tenant.stripeConnectAccountId}`,
    );

    const connected = Boolean(account.charges_enabled && account.details_submitted);

    // Keep the flag Rentora gates on in step with Stripe.
    if (connected !== tenant.connectOnboarded) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { connectOnboarded: connected },
      });
    }

    return {
      stripeConfigured: true,
      accountId: account.id,
      connected,
      chargesEnabled: Boolean(account.charges_enabled),
      payoutsEnabled: Boolean(account.payouts_enabled),
      detailsSubmitted: Boolean(account.details_submitted),
      requirementsDue: account.requirements?.currently_due ?? [],
      disabledReason: account.requirements?.disabled_reason ?? null,
    };
  }

  /**
   * Returns the URL the tenant owner should be sent to in order to finish onboarding,
   * creating the Express account on first use.
   */
  async createOnboardingLink(input: { refreshUrl: string; returnUrl: string }) {
    const tenantId = requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { stores: { take: 1 } },
    });
    if (!tenant) throw new NotFoundException("Tenant not found");

    let accountId = tenant.stripeConnectAccountId;

    if (!accountId) {
      const store = tenant.stores[0];
      const body = new URLSearchParams({
        type: "express",
        "capabilities[card_payments][requested]": "true",
        "capabilities[transfers][requested]": "true",
        "business_profile[name]": store?.name ?? tenant.name,
        "metadata[tenantId]": tenant.id,
      });
      if (store?.country) body.set("country", store.country);
      if (store?.supportEmail) body.set("email", store.supportEmail);

      const account = await this.stripe<StripeAccount>("accounts", body);
      accountId = account.id;

      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { stripeConnectAccountId: accountId },
      });
    }

    const link = await this.stripe<{ url: string; expires_at: number }>(
      "account_links",
      new URLSearchParams({
        account: accountId,
        refresh_url: input.refreshUrl,
        return_url: input.returnUrl,
        type: "account_onboarding",
      }),
    );

    return { url: link.url, expiresAt: link.expires_at, accountId };
  }

  /** Express dashboard link, for a tenant that has already onboarded. */
  async createDashboardLink() {
    const tenantId = requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

    if (!tenant?.stripeConnectAccountId) {
      throw new BadRequestException("Connect payouts first");
    }

    const link = await this.stripe<{ url: string }>(
      `accounts/${tenant.stripeConnectAccountId}/login_links`,
      new URLSearchParams(),
    );

    return { url: link.url };
  }
}
