import { Page, PageHeader } from "@rentora/ui";
import { UpsellManager } from "@/components/admin/upsell-manager";
import { serverGet } from "@/lib/server-api";
import type { StorefrontBootstrap, UpsellProduct } from "@/lib/types";

export const metadata = { title: "Add-ons" };
export const dynamic = "force-dynamic";

export default async function AdminUpsellsPage() {
  const [upsells, bootstrap] = await Promise.all([
    serverGet<UpsellProduct[]>("/catalog/upsells", { cache: "no-store" }),
    serverGet<StorefrontBootstrap>("/storefront/bootstrap").catch(() => null),
  ]);

  return (
    <Page className="max-w-4xl">
      <PageHeader
        title="Add-ons"
        description="Extras a customer can add to a booking. Attach them to products on the product page."
      />
      <UpsellManager upsells={upsells} currency={bootstrap?.store.currency ?? "USD"} />
    </Page>
  );
}
