"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge, Button, Card, Input } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { clientApi } from "@/lib/client-api";
import { formatMoney } from "@/lib/money";

type Upsell = {
  id: string;
  name: string;
  slug: string;
  priceMinor: number;
  currency: string;
  stockQty: number | null;
  isActive: boolean;
  description: string | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminUpsellsPage() {
  const [upsells, setUpsells] = useState<Upsell[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const rows = await clientApi<Upsell[]>("/catalog/upsells");
      setUpsells(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load upsells");
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
    const name = String(fd.get("name") || "");
    try {
      await clientApi("/catalog/upsells", {
        method: "POST",
        body: JSON.stringify({
          name,
          slug: String(fd.get("slug") || "") || slugify(name),
          priceMinor: Math.round(Number(fd.get("price") || 0) * 100),
          currency: String(fd.get("currency") || "DKK"),
          description: String(fd.get("description") || "") || undefined,
          stockQty: fd.get("stockQty") ? Number(fd.get("stockQty")) : undefined,
        }),
      });
      setMessage("Upsell created");
      e.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(upsell: Upsell) {
    setBusy(true);
    try {
      await clientApi(`/catalog/upsells/${upsell.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !upsell.isActive }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this upsell?")) return;
    setBusy(true);
    try {
      await clientApi(`/catalog/upsells/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <PageHeader
        title="Upsells"
        description="Attach add-ons that appear on product and checkout flows."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <form className="space-y-3" onSubmit={onCreate}>
            <Input name="name" label="Name" required placeholder="Linen package" />
            <Input name="slug" label="Slug" placeholder="linen-package" />
            <Input name="price" label="Price" type="number" step="0.01" required defaultValue={100} />
            <Input name="currency" label="Currency" defaultValue="DKK" />
            <Input name="stockQty" label="Stock (optional)" type="number" />
            <Input name="description" label="Description" />
            <Button type="submit" disabled={busy}>
              Add upsell
            </Button>
          </form>
          {message ? <p className="mt-3 text-sm text-teal-700">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </Card>
        <div className="space-y-3">
          {upsells.length === 0 ? (
            <Card className="p-6 text-sm text-slate-500">No upsells yet.</Card>
          ) : (
            upsells.map((u) => (
              <Card key={u.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-medium">{u.name}</h2>
                  <p className="text-sm text-slate-500">
                    {formatMoney(u.priceMinor, u.currency)}
                    {u.stockQty != null ? ` · stock ${u.stockQty}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={u.isActive ? "accent" : "neutral"}>
                    {u.isActive ? "Active" : "Off"}
                  </Badge>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => toggle(u)}>
                    Toggle
                  </Button>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => remove(u.id)}>
                    Delete
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
