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

        <DomainsPanel />

        <Button className="w-fit" type="button" variant="secondary">
          Save settings
        </Button>
      </div>
    </main>
  );
}

type DomainRow = {
  id: string;
  hostname: string;
  verified: boolean;
  sslStatus: string;
  dns?: Array<{ type: string; host: string; value: string }>;
};

function DomainsPanel() {
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [hostname, setHostname] = useState("");
  const [dns, setDns] = useState<DomainRow["dns"]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const rows = await clientApi<DomainRow[]>("/domains");
      setDomains(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load domains");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function addDomain() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await clientApi<DomainRow>("/domains", {
        method: "POST",
        body: JSON.stringify({ hostname }),
      });
      setDns(res.dns ?? []);
      setHostname("");
      setMessage("Domain added. Create the DNS records below, then verify.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add domain");
    } finally {
      setBusy(false);
    }
  }

  async function verify(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await clientApi<DomainRow & { message?: string }>(`/domains/${id}/verify`, {
        method: "POST",
        body: "{}",
      });
      setDns(res.dns ?? dns);
      setMessage(res.message ?? (res.verified ? "Domain verified" : "Not verified yet"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await clientApi(`/domains/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <h2 className="font-display text-lg font-semibold">Custom domains</h2>
      <p className="text-sm text-muted-foreground">
        Point a CNAME to the platform edge, add the TXT verification record, then verify. SSL is
        provisioned by the domain-ssl worker after verification.
      </p>
      <div className="flex flex-wrap gap-2">
        <Input
          name="hostname"
          label="Hostname"
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
          placeholder="shop.example.com"
        />
        <Button type="button" disabled={busy || !hostname} onClick={addDomain} className="self-end">
          Add domain
        </Button>
      </div>
      {message ? <p className="text-sm text-teal-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {dns && dns.length > 0 ? (
        <ul className="space-y-2 rounded-lg bg-muted px-3 py-2 font-mono text-xs">
          {dns.map((r) => (
            <li key={`${r.type}-${r.host}`}>
              {r.type} {r.host} → {r.value}
            </li>
          ))}
        </ul>
      ) : null}
      <ul className="space-y-2 text-sm">
        {domains.map((d) => (
          <li
            key={d.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
          >
            <span>
              {d.hostname} · {d.verified ? "verified" : "pending"} · SSL {d.sslStatus}
            </span>
            <span className="flex gap-2">
              {!d.verified ? (
                <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => verify(d.id)}>
                  Verify
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => remove(d.id)}>
                Remove
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
