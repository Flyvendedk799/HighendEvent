import { Banner, Page, PageHeader } from "@rentora/ui";
import Link from "next/link";
import { DeliveryForm } from "@/components/admin/delivery-form";
import { getDeliverySettings, getLocations } from "@/lib/actions/operations";
import { serverGet } from "@/lib/server-api";
import type { StorefrontBootstrap } from "@/lib/types";

export const metadata = { title: "Delivery" };
export const dynamic = "force-dynamic";

export default async function AdminDeliveryPage() {
  const [settings, locations, bootstrap] = await Promise.all([
    getDeliverySettings(),
    getLocations(),
    serverGet<StorefrontBootstrap>("/storefront/bootstrap").catch(() => null),
  ]);

  const delivery = settings.find((s) => s.type === "DELIVERY");
  const pickup = settings.find((s) => s.type === "PICKUP");
  const origin = locations.find((l) => l.isPrimary && l.isActive);
  const originHasCoords = Boolean(origin?.latitude && origin?.longitude);

  return (
    <Page className="max-w-3xl">
      <PageHeader
        title="Delivery"
        description="What you charge to bring the kit to a customer, measured from your main location."
      />

      {!originHasCoords ? (
        <Banner tone="warning" title="Delivery quotes need a starting point" className="mb-6">
          Set coordinates on your main location and delivery distances can be calculated.{" "}
          <Link href="/admin/locations" className="font-medium underline">
            Open locations
          </Link>
        </Banner>
      ) : (
        <p className="mb-6 text-sm text-[var(--color-muted-foreground)]">
          Distances are measured from <strong>{origin!.name}</strong>, {origin!.zipCode}{" "}
          {origin!.city}.
        </p>
      )}

      <DeliveryForm
        delivery={delivery}
        pickup={pickup}
        currency={bootstrap?.store.currency ?? "USD"}
        canEnableDelivery={originHasCoords}
      />
    </Page>
  );
}
