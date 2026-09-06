"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, CardHeader, Select } from "@rentora/ui";
import { clientApi } from "@/lib/client-api";

const PLANS = ["STARTER", "GROWTH", "SCALE"] as const;

const FLAG_KEYS = [
  "customDomains",
  "upsells",
  "deliveryZones",
  "apiAccess",
  "advancedCms",
] as const;

export function TenantActions({
  tenantId,
  slug,
  plan,
  isSuspended,
  featureFlags,
}: {
  tenantId: string;
  slug: string;
  plan: string;
  isSuspended: boolean;
  featureFlags: Record<string, unknown>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState(plan);
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    const next: Record<string, boolean> = {};
    for (const key of FLAG_KEYS) next[key] = Boolean(featureFlags[key]);
    return next;
  });

  async function suspend(suspended: boolean) {
    setBusy(true);
    setError(null);
    try {
      await clientApi(`/platform/tenants/${tenantId}/suspend`, {
        method: "PATCH",
        body: JSON.stringify({ suspended }),
      });
      setMessage(suspended ? "Tenant suspended" : "Tenant reactivated");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suspend failed");
    } finally {
      setBusy(false);
    }
  }

  async function savePlan() {
    setBusy(true);
    setError(null);
    try {
      await clientApi(`/platform/tenants/${tenantId}`, {
        method: "PATCH",
        body: JSON.stringify({ plan: selectedPlan }),
      });
      setMessage(`Plan set to ${selectedPlan}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan update failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveFlags() {
    setBusy(true);
    setError(null);
    try {
      await clientApi(`/platform/tenants/${tenantId}`, {
        method: "PATCH",
        body: JSON.stringify({ featureFlags: flags }),
      });
      setMessage("Feature flags saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Flag update failed");
    } finally {
      setBusy(false);
    }
  }

  async function impersonate() {
    setBusy(true);
    setError(null);
    try {
      const res = await clientApi<{
        accessToken: string;
        adminUrl: string;
        tenant: { slug: string };
        note: string;
      }>(`/platform/tenants/${tenantId}/impersonate`, { method: "POST" });
      const sessionRes = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: res.accessToken, maxAgeSeconds: 60 * 60 }),
      });
      if (!sessionRes.ok) {
        throw new Error("Could not establish impersonation session cookie");
      }
      setMessage(res.note);
      window.location.href = res.adminUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impersonation failed");
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4">
      <CardHeader title="Actions" description={slug} />
      {message ? <p className="text-sm text-teal-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="space-y-2">
        <Select
          label="Plan"
          value={selectedPlan}
          onChange={(e) => setSelectedPlan(e.target.value)}
        >
          {PLANS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Button className="w-full" variant="secondary" disabled={busy} onClick={savePlan}>
          Update plan
        </Button>
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-sm font-medium">Feature flags</p>
        {FLAG_KEYS.map((key) => (
          <label key={key} className="flex items-center justify-between gap-2 text-sm">
            <span className="font-mono text-xs">{key}</span>
            <input
              type="checkbox"
              checked={flags[key]}
              onChange={(e) => setFlags((prev) => ({ ...prev, [key]: e.target.checked }))}
            />
          </label>
        ))}
        <Button className="w-full" variant="secondary" disabled={busy} onClick={saveFlags}>
          Save flags
        </Button>
      </div>

      <Button className="w-full" variant="secondary" disabled={busy} onClick={() => void impersonate()}>
        View as tenant
      </Button>

      <Button
        className="w-full"
        variant="secondary"
        disabled={busy}
        onClick={() => suspend(!isSuspended)}
      >
        {isSuspended ? "Reactivate tenant" : "Suspend tenant"}
      </Button>
    </Card>
  );
}
