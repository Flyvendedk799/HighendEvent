"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, Button, Card, Input, Select, Textarea } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { clientApi } from "@/lib/client-api";
import { uploadMediaFile } from "@/lib/media-upload";

type Category = { id: string; name: string };
type Blackout = { id: string; startDate: string; endDate: string; reason: string | null };
type ProductImage = { id: string; url: string; alt: string };
type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string;
  dailyPriceMinor: number;
  weekendPriceMinor: number | null;
  depositMinor: number;
  currency: string;
  stockQty: number;
  prepBufferDays: number;
  cleanupBufferDays: number;
  isActive: boolean;
  heroImageUrl: string | null;
  images?: ProductImage[];
  blackouts?: Blackout[];
};

export default function AdminProductEditPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [p, cats] = await Promise.all([
        clientApi<Product>(`/catalog/products/${productId}`),
        clientApi<Category[]>("/catalog/categories"),
      ]);
      setProduct(p);
      setCategories(cats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load product");
    }
  }

  useEffect(() => {
    void load();
  }, [productId]);

  const blackouts = useMemo(() => product?.blackouts ?? [], [product]);

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!product) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    try {
      await clientApi(`/catalog/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          categoryId: String(fd.get("categoryId") || ""),
          name: String(fd.get("name") || ""),
          slug: String(fd.get("slug") || ""),
          description: String(fd.get("description") || "") || undefined,
          dailyPriceMinor: Math.round(Number(fd.get("dailyPrice") || 0) * 100),
          weekendPriceMinor: fd.get("weekendPrice")
            ? Math.round(Number(fd.get("weekendPrice")) * 100)
            : undefined,
          depositMinor: Math.round(Number(fd.get("deposit") || 0) * 100),
          currency: String(fd.get("currency") || "DKK"),
          stockQty: Number(fd.get("stockQty") || 1),
          prepBufferDays: Number(fd.get("prepBufferDays") || 0),
          cleanupBufferDays: Number(fd.get("cleanupBufferDays") || 0),
          heroImageUrl: String(fd.get("heroImageUrl") || "") || undefined,
          isActive: fd.get("isActive") === "on",
        }),
      });
      setMessage("Product saved");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function addImage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!product) return;
    setBusy(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = (fd.get("file") as File | null) ?? null;
    const alt = String(fd.get("alt") || product.name);
    try {
      let url = String(fd.get("url") || "").trim();
      if (file && file.size > 0) {
        const uploaded = await uploadMediaFile(file, { alt });
        url = uploaded.publicUrl;
      }
      if (!url) throw new Error("Choose a file or paste an image URL");
      await clientApi(`/catalog/products/${product.id}/images`, {
        method: "POST",
        body: JSON.stringify({ url, alt }),
      });
      if (!product.heroImageUrl) {
        await clientApi(`/catalog/products/${product.id}`, {
          method: "PATCH",
          body: JSON.stringify({ heroImageUrl: url }),
        });
      }
      form.reset();
      await load();
      setMessage("Image attached to product.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image add failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeImage(imageId: string) {
    if (!product) return;
    setBusy(true);
    try {
      await clientApi(`/catalog/products/${product.id}/images/${imageId}`, {
        method: "DELETE",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function addBlackout(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!product) return;
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      await clientApi(`/catalog/products/${product.id}/blackouts`, {
        method: "POST",
        body: JSON.stringify({
          startDate: String(fd.get("startDate") || ""),
          endDate: String(fd.get("endDate") || ""),
          reason: String(fd.get("reason") || "") || undefined,
        }),
      });
      e.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Blackout create failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeBlackout(blackoutId: string) {
    if (!product) return;
    setBusy(true);
    try {
      await clientApi(`/catalog/products/${product.id}/blackouts/${blackoutId}`, {
        method: "DELETE",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Blackout delete failed");
    } finally {
      setBusy(false);
    }
  }

  if (!product && !error) {
    return <main className="p-6 text-sm text-slate-500">Loading product…</main>;
  }

  if (!product) {
    return <main className="p-6 text-sm text-red-600">{error}</main>;
  }

  return (
    <main>
      <PageHeader
        title={product.name}
        description="Edit pricing, media, buffers, and blackout dates."
        action={
          <Badge tone={product.isActive ? "success" : "neutral"}>
            {product.isActive ? "Active" : "Archived"}
          </Badge>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <form className="space-y-4" onSubmit={onSave}>
            <Input name="name" label="Name" required defaultValue={product.name} />
            <Input name="slug" label="Slug" required defaultValue={product.slug} />
            <Select name="categoryId" label="Category" required defaultValue={product.categoryId}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Textarea
              name="description"
              label="Description"
              rows={4}
              defaultValue={product.description ?? ""}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                name="dailyPrice"
                label="Daily price"
                type="number"
                step="0.01"
                required
                defaultValue={(product.dailyPriceMinor / 100).toFixed(2)}
              />
              <Input
                name="weekendPrice"
                label="Weekend price"
                type="number"
                step="0.01"
                defaultValue={
                  product.weekendPriceMinor != null
                    ? (product.weekendPriceMinor / 100).toFixed(2)
                    : ""
                }
              />
              <Input
                name="deposit"
                label="Deposit"
                type="number"
                step="0.01"
                defaultValue={(product.depositMinor / 100).toFixed(2)}
              />
              <Input name="currency" label="Currency" defaultValue={product.currency} />
              <Input name="stockQty" label="Stock qty" type="number" defaultValue={product.stockQty} />
              <Input
                name="prepBufferDays"
                label="Prep buffer (days)"
                type="number"
                defaultValue={product.prepBufferDays}
              />
              <Input
                name="cleanupBufferDays"
                label="Cleanup buffer (days)"
                type="number"
                defaultValue={product.cleanupBufferDays}
              />
              <Input
                name="heroImageUrl"
                label="Hero image URL"
                defaultValue={product.heroImageUrl ?? ""}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input name="isActive" type="checkbox" defaultChecked={product.isActive} />
              Active / published
            </label>
            <Button type="submit" disabled={busy}>
              Save product
            </Button>
          </form>
          {message ? <p className="mt-3 text-sm text-teal-700">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </Card>

        <div className="space-y-6">
          <Card className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Images</h2>
            <ul className="space-y-2">
              {(product.images ?? []).length === 0 ? (
                <li className="text-sm text-slate-500">No images yet.</li>
              ) : (
                (product.images ?? []).map((img) => (
                  <li key={img.id} className="flex items-center justify-between gap-3 text-sm">
                    <a href={img.url} className="truncate text-teal-800 hover:underline" target="_blank" rel="noreferrer">
                      {img.alt || img.url}
                    </a>
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => removeImage(img.id)}>
                      Remove
                    </Button>
                  </li>
                ))
              )}
            </ul>
            <form className="grid gap-3" onSubmit={addImage}>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Upload file</span>
                <input
                  name="file"
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-teal-800 file:px-3 file:py-1.5 file:text-white"
                />
              </label>
              <Input name="url" label="Or paste image URL" placeholder="https://..." />
              <Input name="alt" label="Alt text" defaultValue={product.name} />
              <Button type="submit" disabled={busy}>
                Add image
              </Button>
            </form>
          </Card>

          <Card className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Blackouts</h2>
            <ul className="space-y-2">
              {blackouts.length === 0 ? (
                <li className="text-sm text-slate-500">No blackout ranges.</li>
              ) : (
                blackouts.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      {String(b.startDate).slice(0, 10)} → {String(b.endDate).slice(0, 10)}
                      {b.reason ? ` · ${b.reason}` : ""}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => removeBlackout(b.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))
              )}
            </ul>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={addBlackout}>
              <Input name="startDate" label="Start" type="date" required />
              <Input name="endDate" label="End" type="date" required />
              <Input name="reason" label="Reason" className="sm:col-span-2" />
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  Add blackout
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}
