import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Badge,
  Banner,
  Breadcrumbs,
  Page,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@rentora/ui";
import { ProductForm } from "@/components/admin/product-form";
import { ProductMedia } from "@/components/admin/product-media";
import { ProductAvailability } from "@/components/admin/product-availability";
import { ProductUpsells } from "@/components/admin/product-upsells";
import { ProductActions } from "@/components/admin/product-actions";
import { updateProductAction } from "@/lib/actions/catalog";
import { getStorageStatus, type StorageStatus } from "@/lib/actions/media";
import { serverGet } from "@/lib/server-api";
import { isApiError } from "@/lib/api";
import type { Category, Product, StorefrontBootstrap, UpsellProduct } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const product = await serverGet<Product>(`/catalog/products/${id}`);
    return { title: product.name };
  } catch {
    return { title: "Product" };
  }
}

const FALLBACK_STORAGE: StorageStatus = {
  configured: false,
  bucket: null,
  publicBaseUrl: null,
  maxBytes: 15 * 1024 * 1024,
  allowedTypes: ["image/jpeg", "image/png", "image/webp"],
  reason: "Object storage status could not be read.",
};

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;

  let product: Product;
  try {
    product = await serverGet<Product>(`/catalog/products/${id}`, { cache: "no-store" });
  } catch (err) {
    if (isApiError(err) && err.status === 404) notFound();
    throw err;
  }

  const [categories, upsells, bootstrap, storage] = await Promise.all([
    serverGet<Category[]>("/catalog/categories?includeInactive=true", { cache: "no-store" }),
    serverGet<UpsellProduct[]>("/catalog/upsells", { cache: "no-store" }).catch(
      () => [] as UpsellProduct[],
    ),
    serverGet<StorefrontBootstrap>("/storefront/bootstrap").catch(() => null),
    getStorageStatus().catch(() => FALLBACK_STORAGE),
  ]);

  const currency = product.currency ?? bootstrap?.store.currency ?? "USD";
  const updateAction = updateProductAction.bind(null, product.id);

  return (
    <Page className="max-w-4xl">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[{ label: "Products", href: "/admin/products" }, { label: product.name }]}
          />
        }
        title={product.name}
        status={
          <Badge tone={product.isActive ? "success" : "neutral"}>
            {product.isActive ? "Published" : "Archived"}
          </Badge>
        }
        description={
          <>
            Storefront address: <code className="text-[11.5px]">/product/{product.slug}</code>
          </>
        }
        action={<ProductActions product={product} />}
      />

      {created ? (
        <Banner tone="success" title="Product created" className="mb-6">
          Add photos next — products with photos get booked far more often.
        </Banner>
      ) : null}

      <Tabs defaultValue={created ? "media" : "general"}>
        <TabsList>
          <TabsTrigger value="general">General &amp; pricing</TabsTrigger>
          <TabsTrigger value="media">
            Photos{product.images?.length ? ` (${product.images.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="upsells">Add-ons</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <ProductForm
            action={updateAction}
            categories={categories}
            currency={currency}
            product={product}
            submitLabel="Save changes"
          />
        </TabsContent>

        <TabsContent value="media">
          <ProductMedia
            productId={product.id}
            images={product.images ?? []}
            storage={storage}
          />
        </TabsContent>

        <TabsContent value="availability">
          <ProductAvailability product={product} blackouts={product.blackouts ?? []} />
        </TabsContent>

        <TabsContent value="upsells">
          <ProductUpsells product={product} allUpsells={upsells} currency={currency} />
        </TabsContent>
      </Tabs>

      <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-paper-faint">
        <Link href={`/product/${product.slug}`} className="hover:underline">
          View this product on your storefront →
        </Link>
      </p>
    </Page>
  );
}
