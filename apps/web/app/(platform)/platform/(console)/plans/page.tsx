import {
  Badge,
  Card,
  CardHeader,
  DataList,
  Money,
  Page,
  PageHeader,
  StatCard,
  Table,
  TableContainer,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@rentora/ui";
import { getPlatformMetrics, getPlatformTenants } from "@/lib/actions/platform";
import { serverGet } from "@/lib/server-api";

export const metadata = { title: "Plans & billing" };
export const dynamic = "force-dynamic";

type Plan = {
  tier: "STARTER" | "GROWTH" | "SCALE";
  name: string;
  priceMinor: number;
  currency: string;
  maxProducts: number | null;
  maxStaff: number | null;
  customDomains: boolean;
  apiAccess: boolean;
  applicationFeeBps: number;
  stripePriceId: string | null;
};

export default async function PlatformPlansPage() {
  const [plans, metrics, tenants] = await Promise.all([
    serverGet<Plan[]>("/billing/plans", { cache: "no-store" }).catch(() => [] as Plan[]),
    getPlatformMetrics(),
    getPlatformTenants(),
  ]);

  const countByPlan = new Map(metrics?.byPlan.map((row) => [row.plan, row.tenants]) ?? []);

  return (
    <Page>
      <PageHeader
        title="Plans & billing"
        description="What Rentora charges tenants, and what each plan includes."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Subscription MRR"
          value={<Money amountMinor={metrics?.mrrMinor ?? 0} currency="USD" />}
          hint="Sum of the plans tenants are on"
        />
        <StatCard label="Paying tenants" value={metrics?.activeTenants ?? 0} />
        <StatCard
          label="Payouts connected"
          value={`${metrics?.connectedTenants ?? 0} of ${metrics?.tenants ?? 0}`}
          hint="Tenants that can take card payments"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.tier}>
            <CardHeader
              title={plan.name}
              action={<Badge tone="neutral">{countByPlan.get(plan.tier) ?? 0} tenants</Badge>}
            />
            <p className="text-2xl font-semibold">
              <Money amountMinor={plan.priceMinor} currency={plan.currency} />
              <span className="text-sm font-normal text-[var(--color-muted-foreground)]">
                {" "}
                / month
              </span>
            </p>
            <DataList
              className="mt-4"
              items={[
                { label: "Products", value: plan.maxProducts ?? "Unlimited" },
                { label: "Staff seats", value: plan.maxStaff ?? "Unlimited" },
                { label: "Custom domains", value: plan.customDomains ? "Yes" : "No" },
                { label: "API access", value: plan.apiAccess ? "Yes" : "No" },
                {
                  label: "Booking fee",
                  value: `${(plan.applicationFeeBps / 100).toFixed(2)}%`,
                },
              ]}
            />
            {!plan.stripePriceId ? (
              <p className="mt-3 text-xs text-amber-700">
                No Stripe price configured — plan changes will not bill.
              </p>
            ) : null}
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">Who is on what</h2>
        <TableContainer>
          <Table>
            <THead>
              <Tr>
                <Th>Store</Th>
                <Th>Plan</Th>
                <Th align="right">Products</Th>
                <Th align="right">Staff</Th>
                <Th align="right">GMV</Th>
              </Tr>
            </THead>
            <TBody>
              {tenants.map((tenant) => (
                <Tr key={tenant.id}>
                  <Td>{tenant.name}</Td>
                  <Td muted>{tenant.plan}</Td>
                  <Td numeric>{tenant.counts.products}</Td>
                  <Td numeric>{tenant.counts.staff}</Td>
                  <Td numeric>
                    <Money amountMinor={tenant.gmvMinor} currency={tenant.currency} />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </TableContainer>
      </div>
    </Page>
  );
}
