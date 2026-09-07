import { Banner, Page, PageHeader, Tabs, TabsContent, TabsList, TabsTrigger } from "@rentora/ui";
import { StoreSettingsForm } from "@/components/admin/store-settings-form";
import { PayoutsCard } from "@/components/admin/payouts-card";
import { DomainsCard } from "@/components/admin/domains-card";
import { PlanCard } from "@/components/admin/plan-card";
import { getConnectStatus, getStoreSettings } from "@/lib/actions/store";
import { getDomains } from "@/lib/actions/domains";
import { serverGet } from "@/lib/server-api";
import type { StorefrontBootstrap } from "@/lib/types";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

type PlanUsage = {
  plan: "STARTER" | "GROWTH" | "SCALE";
  limits: {
    name: string;
    maxProducts: number | null;
    maxStaff: number | null;
    customDomains: boolean;
    apiAccess: boolean;
    applicationFeeBps: number;
  };
  usage: { products: number; staff: number; domains: number };
  atProductLimit: boolean;
  atStaffLimit: boolean;
};

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>;
}) {
  const { connect } = await searchParams;

  const [store, connectStatus, domains, bootstrap, planUsage] = await Promise.all([
    getStoreSettings(),
    getConnectStatus(),
    getDomains(),
    serverGet<StorefrontBootstrap>("/storefront/bootstrap").catch(() => null),
    serverGet<PlanUsage>("/billing/limits", { cache: "no-store" }).catch(() => null),
  ]);

  const fallbackHost = `${bootstrap?.tenant.slug ?? "your-store"}.rentora.app`;

  return (
    <Page className="max-w-4xl">
      <PageHeader
        title="Settings"
        description="Your store, how you take money, and where customers find you."
      />

      {connect === "done" ? (
        <Banner tone="info" title="Back from Stripe" className="mb-6">
          If Stripe still has questions, the payouts card below will say what is outstanding.
        </Banner>
      ) : null}

      <Tabs defaultValue="store">
        <TabsList>
          <TabsTrigger value="store">Store</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="domains">Domains</TabsTrigger>
          <TabsTrigger value="plan">Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="store">
          <StoreSettingsForm store={store} />
        </TabsContent>

        <TabsContent value="payments">
          <PayoutsCard status={connectStatus} />
        </TabsContent>

        <TabsContent value="domains">
          <DomainsCard
            domains={domains}
            fallbackHost={fallbackHost}
            allowed={planUsage?.limits.customDomains ?? false}
          />
        </TabsContent>

        <TabsContent value="plan">
          <PlanCard usage={planUsage} />
        </TabsContent>
      </Tabs>
    </Page>
  );
}
