"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { clientApi, getClientTenantSlug } from "@/lib/client-api";

type ProductOption = { id: string; name: string; slug: string };

export default function AdminBookingCreatePage() {
  const router = useRouter();
  const tenantSlug = getClientTenantSlug();
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void clientApi<ProductOption[]>("/catalog/products", { tenantSlug })
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]));
  }, [tenantSlug]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const productId = String(form.get("productId") || "");
    const quantity = Number(form.get("quantity") || 1);

    try {
      const booking = await clientApi<{ id: string }>("/bookings/manual", {
        method: "POST",
        tenantSlug,
        body: JSON.stringify({
          source: "MANUAL",
          customerName: String(form.get("customerName") || ""),
          email: String(form.get("email") || ""),
          phone: String(form.get("phone") || ""),
          address: String(form.get("address") || "Warehouse pickup"),
          zipCode: String(form.get("zipCode") || ""),
          city: String(form.get("city") || ""),
          startDate: String(form.get("startDate") || ""),
          endDate: String(form.get("endDate") || ""),
          deliveryType: "PICKUP",
          notes: String(form.get("notes") || "") || undefined,
          items: [{ productId, quantity }],
        }),
      });
      router.push(`/admin/bookings/${booking.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create booking");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <PageHeader
        title="Create manual booking"
        description="For phone / walk-in orders with live availability checks."
      />
      <form className="grid max-w-3xl gap-6" onSubmit={onSubmit}>
        <Card className="grid gap-4 sm:grid-cols-2">
          <Input name="customerName" label="Customer name" placeholder="Event House ApS" required />
          <Input name="email" type="email" label="Email" placeholder="hello@eventhouse.dk" required />
          <Input name="phone" label="Phone" placeholder="+45 12 34 56 78" required />
          <Input name="address" label="Address" placeholder="Street" required />
          <Input name="zipCode" label="ZIP" placeholder="2100" required />
          <Input name="city" label="City" placeholder="Copenhagen" required />
          <Input name="startDate" type="date" label="Start date" required />
          <Input name="endDate" type="date" label="End date" required />
          <Select
            name="productId"
            label="Product"
            required
            defaultValue={products[0]?.id}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Input name="quantity" type="number" label="Quantity" defaultValue={1} min={1} required />
          <Input name="notes" label="Internal notes" placeholder="Deposit waived" className="sm:col-span-2" />
        </Card>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex gap-3">
          <Button type="submit" disabled={loading || products.length === 0}>
            {loading ? "Saving…" : "Save booking"}
          </Button>
          <Link href="/admin/bookings">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </main>
  );
}
