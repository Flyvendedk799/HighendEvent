import { Page, PageHeader } from "@rentora/ui";
import { CouponManager } from "@/components/admin/coupon-manager";
import { getCoupons } from "@/lib/actions/coupons";
import { serverGet } from "@/lib/server-api";
import type { StorefrontBootstrap } from "@/lib/types";

export const metadata = { title: "Discount codes" };
export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const [coupons, bootstrap] = await Promise.all([
    getCoupons(),
    serverGet<StorefrontBootstrap>("/storefront/bootstrap").catch(() => null),
  ]);

  return (
    <Page className="max-w-4xl">
      <PageHeader
        title="Discount codes"
        description="Codes customers can enter at checkout. Every use is counted."
      />
      <CouponManager coupons={coupons} currency={bootstrap?.store.currency ?? "USD"} />
    </Page>
  );
}
