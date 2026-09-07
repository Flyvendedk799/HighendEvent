import Link from "next/link";
import {
  Badge,
  Button,
  EmptyState,
  FilterBar,
  Money,
  Page,
  PageHeader,
  SearchInput,
  Select,
  Table,
  TableContainer,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@rentora/ui";
import { serverGet } from "@/lib/server-api";
import type { Category, Product, StorefrontBootstrap } from "@/lib/types";

export const metadata = { title: "Products" };
export const dynamic = "force-dynamic";

type SearchParams = { q?: string; category?: string; status?: string };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const query = new URLSearchParams({ includeInactive: "true" });
  if (params.q) query.set("q", params.q);
  if (params.category) query.set("categoryId", params.category);

  const [products, categories, bootstrap] = await Promise.all([
    serverGet<Product[]>(`/catalog/products?${query}`, { cache: "no-store" }),
    serverGet<Array<Category & { _count?: { products: number } }>>(
      "/catalog/categories?includeInactive=true",
      { cache: "no-store" },
    ),
    serverGet<StorefrontBootstrap>("/storefront/bootstrap").catch(() => null),
  ]);

  const currency = bootstrap?.store.currency ?? "USD";

  const visible = products.filter((product) => {
    if (params.status === "active") return product.isActive;
    if (params.status === "archived") return !product.isActive;
    return true;
  });

  const isFiltered = Boolean(params.q || params.category || params.status);

  return (
    <Page>
      <PageHeader
        title="Products"
        description="Rental inventory, pricing, and the buffers that protect your turnaround."
        action={
          <Button asChild>
            <Link href="/admin/products/new">Add product</Link>
          </Button>
        }
      />

      <FilterBar>
        <SearchInput defaultValue={params.q} placeholder="Search products" />
        <Select
          name="category"
          defaultValue={params.category ?? ""}
          aria-label="Category"
          className="w-44"
          options={[
            { value: "", label: "All categories" },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <Select
          name="status"
          defaultValue={params.status ?? ""}
          aria-label="Status"
          className="w-36"
          options={[
            { value: "", label: "All statuses" },
            { value: "active", label: "Published" },
            { value: "archived", label: "Archived" },
          ]}
        />
        <Button type="submit" variant="secondary">
          Apply
        </Button>
        {isFiltered ? (
          <Button variant="ghost" asChild>
            <Link href="/admin/products">Clear</Link>
          </Button>
        ) : null}
      </FilterBar>

      <TableContainer>
        <Table>
          <THead>
            <Tr>
              <Th>Product</Th>
              <Th>Category</Th>
              <Th align="right">Daily</Th>
              <Th align="right">Weekend</Th>
              <Th align="right">Deposit</Th>
              <Th align="right">Stock</Th>
              <Th align="right">Buffers</Th>
              <Th>Status</Th>
            </Tr>
          </THead>
          <TBody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12">
                  {isFiltered ? (
                    <EmptyState
                      title="No products match those filters"
                      description="Try a different search or clear the filters."
                      action={
                        <Button variant="secondary" asChild>
                          <Link href="/admin/products">Clear filters</Link>
                        </Button>
                      }
                    />
                  ) : (
                    <EmptyState
                      title="No products yet"
                      description="Add your first rental item — name it, price it per day, and set how many you own."
                      action={
                        <Button asChild>
                          <Link href="/admin/products/new">Add your first product</Link>
                        </Button>
                      }
                    />
                  )}
                </td>
              </tr>
            ) : (
              visible.map((product) => (
                <Tr key={product.id} interactive>
                  <Td>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="flex items-center gap-3"
                    >
                      <ProductThumb product={product} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{product.name}</span>
                        <span className="block truncate text-xs text-[var(--color-muted-foreground)]">
                          /{product.slug}
                        </span>
                      </span>
                    </Link>
                  </Td>
                  <Td muted>{product.category?.name ?? "—"}</Td>
                  <Td numeric>
                    <Money amountMinor={product.dailyPriceMinor} currency={product.currency ?? currency} />
                  </Td>
                  <Td numeric muted>
                    {product.weekendPriceMinor ? (
                      <Money
                        amountMinor={product.weekendPriceMinor}
                        currency={product.currency ?? currency}
                      />
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td numeric muted>
                    <Money
                      amountMinor={product.depositMinor}
                      currency={product.currency ?? currency}
                      dashWhenZero
                    />
                  </Td>
                  <Td numeric>{product.stockQty}</Td>
                  <Td numeric muted>
                    {product.prepBufferDays || product.cleanupBufferDays
                      ? `${product.prepBufferDays}/${product.cleanupBufferDays}`
                      : "—"}
                  </Td>
                  <Td>
                    <Badge tone={product.isActive ? "success" : "neutral"}>
                      {product.isActive ? "Published" : "Archived"}
                    </Badge>
                  </Td>
                </Tr>
              ))
            )}
          </TBody>
        </Table>
      </TableContainer>

      {visible.length > 0 ? (
        <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
          Buffers show prep/cleanup days. They block the calendar around each booking so the crew
          has time to turn stock around.
        </p>
      ) : null}
    </Page>
  );
}

function ProductThumb({ product }: { product: Product }) {
  const src = product.heroImageUrl ?? product.images?.[0]?.url;

  if (!src) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--color-muted)] text-[11px] font-medium text-[var(--color-muted-foreground)]">
        {product.name.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    // Tenant images live on arbitrary hosts, so this stays a plain img.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="h-9 w-9 shrink-0 rounded-md object-cover"
      loading="lazy"
    />
  );
}
