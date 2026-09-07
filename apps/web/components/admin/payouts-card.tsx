"use client";

import { useTransition } from "react";
import { Badge, Banner, Button, Card, CardHeader, useToast } from "@rentora/ui";
import {
  openConnectDashboardAction,
  startConnectOnboardingAction,
  type ConnectStatus,
} from "@/lib/actions/store";

/**
 * Payout onboarding. The state shown here comes from Stripe, not from whether the tenant has
 * clicked the button — a half-finished onboarding must not read as connected.
 */
export function PayoutsCard({ status }: { status: ConnectStatus | null }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function go(action: () => Promise<{ url?: string; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error || !result.url) {
        toast({
          title: "Could not open Stripe",
          description: result.error ?? "No link was returned.",
          tone: "error",
        });
        return;
      }
      window.location.href = result.url;
    });
  }

  if (!status?.stripeConfigured) {
    return (
      <Card>
        <CardHeader title="Payouts" />
        <Banner tone="info" title="Stripe is not configured on this deployment">
          {status?.disabledReason ??
            "Set STRIPE_SECRET_KEY on the API to enable payouts. Until then, bookings are taken without charging a card and are clearly labelled as such."}
        </Banner>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Payouts"
        description="Money from your bookings settles into your own Stripe account."
        action={
          <Badge tone={status.connected ? "success" : "warning"}>
            {status.connected ? "Ready" : "Action needed"}
          </Badge>
        }
      />

      {status.connected ? (
        <>
          <dl className="space-y-1.5 text-[13.5px]">
            <Row label="Charges" value={status.chargesEnabled ? "Enabled" : "Disabled"} />
            <Row label="Payouts" value={status.payoutsEnabled ? "Enabled" : "On hold"} />
            <Row label="Account" value={status.accountId ?? "—"} />
          </dl>
          {!status.payoutsEnabled ? (
            <Banner tone="warning" className="mt-4">
              You can take payments, but Stripe is holding payouts until it has everything it
              needs.
            </Banner>
          ) : null}
          <Button
            variant="secondary"
            className="mt-4"
            loading={pending}
            onClick={() => go(openConnectDashboardAction)}
          >
            Open Stripe dashboard
          </Button>
        </>
      ) : (
        <>
          <p className="text-[13.5px] text-paper-mute">
            Connect a Stripe account to accept card payments. It takes a few minutes and needs
            your business details and a bank account.
          </p>

          {status.requirementsDue.length > 0 ? (
            <Banner tone="warning" title="Stripe still needs" className="mt-4">
              <ul className="mt-1 list-disc pl-4">
                {status.requirementsDue.slice(0, 5).map((requirement) => (
                  <li key={requirement}>{requirement.replace(/[._]/g, " ")}</li>
                ))}
              </ul>
            </Banner>
          ) : null}

          {status.disabledReason ? (
            <Banner tone="danger" className="mt-4">
              {status.disabledReason.replace(/[._]/g, " ")}
            </Banner>
          ) : null}

          <Button
            className="mt-4"
            loading={pending}
            onClick={() => go(startConnectOnboardingAction)}
          >
            {status.accountId ? "Finish payout setup" : "Set up payouts"}
          </Button>
        </>
      )}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-paper-mute">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}
