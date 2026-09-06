"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, Input } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { clientApi } from "@/lib/client-api";
import { formatMoney } from "@/lib/money";

type DeliverySetting = {
  id: string;
  type: "PICKUP" | "DELIVERY";
  baseFeeMinor: number;
  perKmFeeMinor: number;
  freeDeliveryKm: number;
  maxDeliveryKm: number | null;
  currency: string;
  notes: string | null;
  isActive: boolean;
};

type DeliveryZone = {
  id: string;
  name: string;
  feeMinor: number;
  currency: string;
  isActive: boolean;
};

export default function AdminDeliveryPage() {
  const [settings, setSettings] = useState<DeliverySetting[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [s, z] = await Promise.all([
        clientApi<DeliverySetting[]>("/delivery-settings"),
        clientApi<DeliveryZone[]>("/delivery-settings/zones"),
      ]);
      setSettings(s);
      setZones(z);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load delivery settings");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const delivery = settings.find((s) => s.type === "DELIVERY");

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    try {
      await clientApi("/delivery-settings", {
        method: "PUT",
        body: JSON.stringify({
          type: "DELIVERY",
          baseFeeMinor: Math.round(Number(fd.get("baseFee") || 0) * 100),
          perKmFeeMinor: Math.round(Number(fd.get("perKmFee") || 0) * 100),
          freeDeliveryKm: Number(fd.get("freeDeliveryKm") || 0),
          maxDeliveryKm: fd.get("maxDeliveryKm") ? Number(fd.get("maxDeliveryKm")) : null,
          currency: String(fd.get("currency") || "DKK"),
          notes: String(fd.get("notes") || "") || undefined,
          isActive: true,
        }),
      });
      setMessage("Delivery settings saved");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAddZone(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await clientApi("/delivery-settings/zones", {
        method: "POST",
        body: JSON.stringify({
          name: String(fd.get("name") || ""),
          feeMinor: Math.round(Number(fd.get("fee") || 0) * 100),
          currency: String(fd.get("currency") || "DKK"),
        }),
      });
      e.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Zone create failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeZone(id: string) {
    setBusy(true);
    try {
      await clientApi(`/delivery-settings/zones/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <PageHeader title="Delivery" description="Base fees, distance bands, and delivery zones." />
      <div className="grid max-w-4xl gap-6">
        <Card>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSave}>
            <Input
              name="baseFee"
              label="Base delivery fee"
              type="number"
              step="0.01"
              defaultValue={((delivery?.baseFeeMinor ?? 35000) / 100).toFixed(2)}
            />
            <Input
              name="perKmFee"
              label="Per km fee"
              type="number"
              step="0.01"
              defaultValue={((delivery?.perKmFeeMinor ?? 1200) / 100).toFixed(2)}
            />
            <Input
              name="freeDeliveryKm"
              label="Free radius (km)"
              type="number"
              defaultValue={delivery?.freeDeliveryKm ?? 5}
            />
            <Input
              name="maxDeliveryKm"
              label="Max radius (km)"
              type="number"
              defaultValue={delivery?.maxDeliveryKm ?? 60}
            />
            <Input name="currency" label="Currency" defaultValue={delivery?.currency ?? "DKK"} />
            <Input name="notes" label="Notes" defaultValue={delivery?.notes ?? ""} />
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>
                Save delivery settings
              </Button>
            </div>
          </form>
        </Card>
        <Card className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Zones</h2>
          <ul className="space-y-2">
            {zones.length === 0 ? (
              <li className="text-sm text-slate-500">No custom zones yet.</li>
            ) : (
              zones.map((z) => (
                <li
                  key={z.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{z.name}</span>
                  <span className="flex items-center gap-3 text-slate-500">
                    {formatMoney(z.feeMinor, z.currency)}
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => removeZone(z.id)}>
                      Remove
                    </Button>
                  </span>
                </li>
              ))
            )}
          </ul>
          <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={onAddZone}>
            <Input name="name" label="Zone name" required placeholder="Zone A · City" />
            <Input name="fee" label="Fee" type="number" step="0.01" required defaultValue={350} />
            <input type="hidden" name="currency" value="DKK" />
            <div className="flex items-end">
              <Button type="submit" disabled={busy}>
                Add zone
              </Button>
            </div>
          </form>
        </Card>
        {message ? <p className="text-sm text-teal-700">{message}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </main>
  );
}
