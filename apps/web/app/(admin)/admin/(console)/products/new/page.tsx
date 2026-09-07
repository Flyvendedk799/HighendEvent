import Link from "next/link";
import { Banner, Breadcrumbs, Button, Page, PageHeader } from "@rentora/ui";
import { ProductForm } from "@/components/admin/product-form";
import { createProductAction } from "@/lib/actions/catalog";
import { serverGet } from "@/lib/server-api";
import type { Category, StorefrontBootstrap } from "@/lib/types";

export const metadata = { title: "New product" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [categories, bootstrap] = await Promise.all([
    serverGet<Category[]>("/catalog/categories?includeInactive=true", { cache: "no-store" }),
    serverGet<StorefrontBootstrap>("/storefront/bootstrap").catch(() => null),
  ]);

  return (
    <Page className="max-w-3xl">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Products", href: "/admin/products" },
              { label: "New product" },
            ]}
          />
        }
        title="Add a product"
        description="Name it, price it per day, and say how many you own. You can add photos next."
      />

      {categories.length === 0 ? (
        <Banner
          tone="warning"
          title="You need a category first"
          className="mb-6"
          action={
            <Button size="sm" variant="secondary" asChild>
              <Link href="/admin/categories">Create a category</Link>
            </Button>
          }
        >
          Every product belongs to a category so shoppers can browse your catalog.
        </Banner>
      ) : null}

      <ProductForm
        action={createProductAction}
        categories={categories}
        currency={bootstrap?.store.currency ?? "USD"}
        submitLabel="Create product"
      />
    </Page>
  );
}
