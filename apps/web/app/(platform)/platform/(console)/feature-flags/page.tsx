import { Page, PageHeader } from "@rentora/ui";
import { FeatureFlagsGrid, FLAGS } from "@/components/platform/feature-flags-grid";
import { getPlatformTenants } from "@/lib/actions/platform";

export const metadata = { title: "Feature flags" };
export const dynamic = "force-dynamic";

export default async function PlatformFeatureFlagsPage() {
  const tenants = await getPlatformTenants();

  return (
    <Page>
      <PageHeader
        title="Feature flags"
        description="Per-tenant overrides. Changes take effect on the tenant's next request."
      />
      <FeatureFlagsGrid tenants={tenants} flags={[...FLAGS]} />
    </Page>
  );
}
