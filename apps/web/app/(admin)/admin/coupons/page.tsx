"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge, Button, Card, Input } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { clientApi } from "@/lib/client-api";
import { formatMoney } from "@/lib/money";

type Coupon = {
  id: string;
  code: string;
  percentOffBps: number | null;
  amountOffMinor: number | null;
  currency: string | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  isActive: boolean;
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const rows = await clientApi<Coupon[]>("/coupons");
      setCoupons(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load coupons");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const percent = Number(fd.get("percentOff") || 0);
    const amount = Number(fd.get("amountOff") || 0);
    try {
      await clientApi("/coupons", {
        method: "POST",
        body: JSON.stringify({
          code: String(fd.get("code") || ""),
          percentOffBps: percent > 0 ? Math.round(percent * 100) : undefined,
          amountOffMinor: amount > 0 ? Math.round(amount * 100) : undefined,
          maxRedemptions: fd.get("maxRedemptions")
            ? Number(fd.get("maxRedemptions"))
            : undefined,
        }),
      });
      setMessage("Coupon created");
      e.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(coupon: Coupon) {
    setBusy(true);
    try {
      await clientApi(`/coupons/${coupon.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await clientApi(`/coupons/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <PageHeader title="Coupons" description="Percentage or fixed discounts for checkout." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <form className="space-y-3" onSubmit={onCreate}>
            <Input name="code" label="Code" required placeholder="SUMMER10" />
            <Input name="percentOff" label="Percent off" type="number" step="0.01" placeholder="10" />
            <Input name="amountOff" label="Amount off" type="number" step="0.01" placeholder="100" />
            <Input name="maxRedemptions" label="Max redemptions" type="number" />
            <Button type="submit" disabled={busy}>
              Create coupon
            </Button>
          </form>
          {message ? <p className="mt-3 text-sm text-teal-700">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </Card>
        <Card className="space-y-3">
          {coupons.length === 0 ? (
            <p className="text-sm text-muted-foreground">No coupons yet.</p>
          ) : (
            coupons.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-3"
              >
                <div>
                  <p className="font-mono font-semibold">{c.code}</p>
                  <p className="text-sm text-muted-foreground">
                    {c.percentOffBps
                      ? `${(c.percentOffBps / 100).toFixed(1)}% off`
                      : formatMoney(c.amountOffMinor ?? 0, c.currency ?? "DKK")}
                    {" · "}
                    {c.redeemedCount}
                    {c.maxRedemptions != null ? `/${c.maxRedemptions}` : ""} redeemed
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={c.isActive ? "success" : "neutral"}>
                    {c.isActive ? "Active" : "Off"}
                  </Badge>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => toggle(c)}>
                    Toggle
                  </Button>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => remove(c.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </main>
  );
}
