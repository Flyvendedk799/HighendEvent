"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select, Textarea } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

type Category = { id: string; name: string };

export function ProductCreateForm({
  categories,
  tenantSlug,
}: {
  categories: Category[];
  tenantSlug: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      categoryId: String(form.get("categoryId") || ""),
      name: String(form.get("name") || ""),
      slug: String(form.get("slug") || ""),
      description: String(form.get("description") || ""),
      dailyPriceMinor: Math.round(Number(form.get("dailyPrice") || 0) * 100),
      stockQty: Number(form.get("stockQty") || 1),
      currency: String(form.get("currency") || "DKK"),
      prepBufferDays: Number(form.get("prepBufferDays") || 0),
      cleanupBufferDays: Number(form.get("cleanupBufferDays") || 0),
    };

    try {
      const res = await fetch("/api/proxy/catalog/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": tenantSlug,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : "Create failed");
        return;
      }
      router.push("/admin/products");
      router.refresh();
    } catch {
      setError("Could not create product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <PageHeader title="Add product" description="Create a rentable inventory item." />
      <Card className="max-w-2xl">
        <form className="space-y-4" onSubmit={onSubmit}>
          <Input name="name" label="Name" required placeholder="6×12m Marquee" />
          <Input name="slug" label="Slug" required placeholder="6x12m-marquee" />
          <Select name="categoryId" label="Category" required defaultValue={categories[0]?.id}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Textarea name="description" label="Description" rows={4} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="dailyPrice" label="Daily price" type="number" step="0.01" required defaultValue={1000} />
            <Input name="currency" label="Currency" defaultValue="DKK" required />
            <Input name="stockQty" label="Stock qty" type="number" min={1} defaultValue={1} required />
            <Input name="prepBufferDays" label="Prep buffer (days)" type="number" min={0} defaultValue={0} />
            <Input name="cleanupBufferDays" label="Cleanup buffer (days)" type="number" min={0} defaultValue={0} />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Create product"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
