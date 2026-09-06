import { headers } from "next/headers";
import { api } from "@/lib/api";
import { ProductCreateForm } from "./product-create-form";

type Category = { id: string; name: string; slug: string };

export default async function AdminProductCreatePage() {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "demo";
  let categories: Category[] = [];
  try {
    categories = await api.get<Category[]>("/catalog/categories", {
      tenantSlug,
      cache: "no-store",
    });
  } catch {
    categories = [];
  }

  return <ProductCreateForm categories={categories} tenantSlug={tenantSlug} />;
}
