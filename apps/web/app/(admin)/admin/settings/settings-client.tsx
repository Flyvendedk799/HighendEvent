"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Input } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { clientApi } from "@/lib/client-api";

type SubscriptionInfo = {
  plan: string;
  connectOnboarded: boolean;
  stripeConnectAccountId: string | null;
};

export default function SettingsClient() {
  const search = useSearchParams();
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    try {
      const data = await clientApi<SubscriptionInfo>("/billing/subscription");
      setInfo(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load billing status");
    }
  }

  useEffect(() => {
    void refresh();
    if (search.get("connect") === "stub_ready") {
      setMessage("Stripe Connect marked ready (stub mode).");
      void clientApi("/billing/connect/refresh", { method: "POST", body: "{}" }).then(refresh);
    }
  }, [search]);

  async function startConnect() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const origin = window.location.origin;
      const res = await clientApi<{ url: string; message?: string }>(
        "/billing/connect/onboard",
        {
          method: "POST",
          body: JSON.stringify({
            returnUrl: `${origin}/admin/settings`,
            refreshUrl: `${origin}/admin/settings`,
          }),
        },
      );
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      setMessage(res.message ?? "Connect onboarding started");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect onboarding failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <PageHeader title="Settings" description="Store identity, tax, and payouts." />
      <div className="grid max-w-3xl gap-6">
        <Card className="grid gap-4 sm:grid-cols-2">
          <Input name="storeName" label="Store name" defaultValue="Demo Rentals" />
          <Input
            name="supportEmail"
            label="Support email"
            defaultValue="hello@demo.rentora.app"
          />
          <Input name="currency" label="Currency" defaultValue="DKK" />
          <Input name="timezone" label="Timezone" defaultValue="Europe/Copenhagen" />
          <Input name="tax" label="VAT %" defaultValue="25" />
          <Input name="deposit" label="Deposit %" defaultValue="30" />
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Payouts (Stripe Connect)</h2>
          <p className="text-sm text-muted-foreground">
            Connect an Express account so storefront checkout can settle to this tenant.
          </p>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="font-medium">{info?.plan ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Connect status</dt>
              <dd className="font-medium">
                {info?.connectOnboarded ? "Ready" : "Not onboarded"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Account</dt>
              <dd className="font-mono text-xs">{info?.stripeConnectAccountId ?? "—"}</dd>
            </div>
          </dl>
          {message ? <p className="text-sm text-teal-700">{message}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button onClick={startConnect} disabled={loading} className="w-fit">
            {loading
              ? "Starting…"
              : info?.connectOnboarded
                ? "Refresh Connect onboarding"
                : "Set up payouts"}
          </Button>
        </Card>

        <Button className="w-fit" type="button" variant="secondary">
          Save settings
        </Button>
      </div>
    </main>
  );
}
