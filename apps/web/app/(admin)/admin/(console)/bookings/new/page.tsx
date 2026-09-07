import Link from "next/link";
import { Banner, Breadcrumbs, Button, Page, PageHeader } from "@rentora/ui";
import { ManualBookingForm } from "@/components/admin/manual-booking-form";
import { serverGet } from "@/lib/server-api";
import type { Product, StorefrontBootstrap } from "@/lib/types";

export const metadata = { title: "New booking" };
export const dynamic = "force-dynamic";

export default async function NewBookingPage() {
  const [products, bootstrap] = await Promise.all([
    serverGet<Product[]>("/catalog/products", { cache: "no-store" }),
    serverGet<StorefrontBootstrap>("/storefront/bootstrap").catch(() => null),
  ]);

  return (
    <Page>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[{ label: "Bookings", href: "/admin/bookings" }, { label: "New booking" }]}
          />
        }
        title="New booking"
        description="For phone and walk-in bookings. Availability and price are checked as you type."
      />

      {products.length === 0 ? (
        <Banner
          tone="warning"
          title="You have no published products"
          action={
            <Button size="sm" variant="secondary" asChild>
              <Link href="/admin/products/new">Add a product</Link>
            </Button>
          }
        >
          Add something rentable before taking a booking.
        </Banner>
      ) : (
        <ManualBookingForm
          products={products}
          currency={bootstrap?.store.currency ?? "USD"}
          deliveryEnabled={bootstrap?.features.deliveryEnabled ?? false}
        />
      )}
    </Page>
  );
}
