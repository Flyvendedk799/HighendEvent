"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge, Button, Card, Input } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { clientApi } from "@/lib/client-api";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  _count?: { products: number };
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const rows = await clientApi<Category[]>("/catalog/categories");
      setCategories(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load categories");
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
    const slug = String(fd.get("slug") || "") || slugify(name);
    try {
      await clientApi("/catalog/categories", {
        method: "POST",
        body: JSON.stringify({
          name,
          slug,
          description: String(fd.get("description") || "") || undefined,
          sortOrder: Number(fd.get("sortOrder") || 0),
        }),
      });
      setMessage("Category created");
      e.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(category: Category) {
    setBusy(true);
    try {
      await clientApi(`/catalog/categories/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !category.isActive }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this category?")) return;
    setBusy(true);
    try {
      await clientApi(`/catalog/categories/${id}`, { method: "DELETE" });
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
        title="Categories"
        description="Organize the catalog and control storefront navigation."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <form className="space-y-3" onSubmit={onCreate}>
            <Input name="name" label="Name" required placeholder="Furniture" />
            <Input name="slug" label="Slug" placeholder="furniture" />
            <Input name="description" label="Description" />
            <Input name="sortOrder" label="Sort order" type="number" defaultValue={0} />
            <Button type="submit" disabled={busy}>
              New category
            </Button>
          </form>
          {message ? <p className="mt-3 text-sm text-teal-700">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </Card>
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.length === 0 ? (
            <Card className="sm:col-span-2 p-6 text-sm text-slate-500">
              No categories yet. Create one to organize products.
            </Card>
          ) : (
            categories.map((c) => (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold">{c.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">/{c.slug}</p>
                    {c.description ? (
                      <p className="mt-2 text-sm text-slate-600">{c.description}</p>
                    ) : null}
                  </div>
                  <Badge tone={c.isActive ? "success" : "neutral"}>
                    {c.isActive ? "Visible" : "Hidden"}
                  </Badge>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => toggleActive(c)}>
                    {c.isActive ? "Hide" : "Show"}
                  </Button>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => remove(c.id)}>
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
