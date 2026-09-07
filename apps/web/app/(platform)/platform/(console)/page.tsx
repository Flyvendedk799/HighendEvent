import Link from "next/link";
import {
  Banner,
  Button,
  Card,
  CardHeader,
  EmptyState,
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
import { getAuditLog, getPlatformMetrics, getPlatformTenants } from "@/lib/actions/platform";
import { tenantSubdomain } from "@/lib/platform";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function PlatformOverviewPage() {
  const [metrics, tenants, audit] = await Promise.all([
    getPlatformMetrics(),
    getPlatformTenants(),
    getAuditLog(),
  ]);

  if (!metrics) {
    return (
      <Page>
        <PageHeader title="Overview" />
        <Banner tone="danger" title="Could not reach the API">
          Platform metrics are unavailable. Check that the Rentora API is running.
        </Banner>
      </Page>
    );
  }

  const notLive = tenants.filter((t) => !t.connectOnboarded && !t.isSuspended);
  const newest = tenants.slice(0, 6);

  return (
    <Page>
      <PageHeader
        title="Overview"
        description="Every store on this deployment."
        action={
          <Button asChild>
            <Link href="/platform/tenants">All tenants</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tenants"
          value={metrics.tenants}
          hint={`${metrics.activeTenants} active · ${metrics.suspendedTenants} suspended`}
        />
        <StatCard
          label="Subscription MRR"
          value={<Money amountMinor={metrics.mrrMinor} currency={metrics.mrrCurrency} />}
          hint="From the plans tenants are on"
        />
        <StatCard
          label="GMV"
          value={<Money amountMinor={metrics.gmvMinor} currency={metrics.mrrCurrency} />}
          hint="Booking value across all tenants"
        />
        <StatCard
          label="Bookings (30 days)"
          value={metrics.bookingsLast30Days}
          hint={`${metrics.bookings} all time`}
        />
      </div>

      {notLive.length > 0 ? (
        <Banner tone="warning" title="Tenants that cannot take money yet" className="mt-6">
          {notLive.length} tenant{notLive.length === 1 ? " has" : "s have"} not finished Stripe
          onboarding: {notLive.slice(0, 5).map((t) => t.slug).join(", ")}
          {notLive.length > 5 ? ` and ${notLive.length - 5} more` : ""}.
        </Banner>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Plan mix" description="Where the subscription revenue comes from." />
          <ul className="space-y-2 text-sm">
            {metrics.byPlan.map((row) => (
              <li key={row.plan} className="flex items-baseline justify-between gap-3">
                <span>{row.plan}</span>
                <span className="tabular">
                  {row.tenants} × <Money amountMinor={row.priceMinor} currency="USD" /> ={" "}
                  <strong>
                    <Money amountMinor={row.priceMinor * row.tenants} currency="USD" />
                  </strong>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Recent operator actions" description="Everything crossing a tenant boundary." />
          {audit.length === 0 ? (
            <EmptyState
              title="No operator actions yet"
              description="Suspensions, plan changes and support access all appear here."
            />
          ) : (
            <ul className="space-y-2 text-sm">
              {audit.slice(0, 8).map((entry) => (
                <li key={entry.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate">{entry.action.replace(/[._]/g, " ")}</span>
                  <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">Newest tenants</h2>
        <TableContainer>
          <Table>
            <THead>
              <Tr>
                <Th>Store</Th>
                <Th>Plan</Th>
                <Th align="right">Products</Th>
                <Th align="right">Bookings</Th>
                <Th align="right">GMV</Th>
              </Tr>
            </THead>
            <TBody>
              {newest.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10">
                    <EmptyState
                      title="No tenants yet"
                      description="Stores appear here as soon as somebody signs up."
                    />
                  </td>
                </tr>
              ) : (
                newest.map((tenant) => (
                  <Tr key={tenant.id} interactive>
                    <Td>
                      <Link
                        href={`/platform/tenants/${tenant.slug}`}
                        className="font-medium hover:underline"
                      >
                        {tenant.name}
                      </Link>
                      <span className="block text-xs text-[var(--color-muted-foreground)]">
                        {tenant.primaryDomain ?? tenantSubdomain(tenant.slug)}
                      </span>
                    </Td>
                    <Td muted>{tenant.plan}</Td>
                    <Td numeric>{tenant.counts.products}</Td>
                    <Td numeric>{tenant.counts.bookings}</Td>
                    <Td numeric>
                      <Money amountMinor={tenant.gmvMinor} currency={tenant.currency} />
                    </Td>
                  </Tr>
                ))
              )}
            </TBody>
          </Table>
        </TableContainer>
      </div>
    </Page>
  );
}
