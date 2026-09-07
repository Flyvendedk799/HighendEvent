import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Badge,
  Breadcrumbs,
  Card,
  CardHeader,
  DataList,
  DetailLayout,
  EmptyState,
  Money,
  Page,
  PageHeader,
  StatCard,
  StatusBadge,
  Table,
  TableContainer,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@rentora/ui";
import { TenantRowActions } from "@/components/platform/tenant-row-actions";
import { serverGet } from "@/lib/server-api";
import { isApiError } from "@/lib/api";
import { getAuditLog, type PlatformTenant } from "@/lib/actions/platform";
import { tenantSubdomain } from "@/lib/platform";

export const dynamic = "force-dynamic";

type TenantDetail = {
  id: string;
  name: string;
  slug: string;
  plan: "STARTER" | "GROWTH" | "SCALE";
  isSuspended: boolean;
  connectOnboarded: boolean;
  stripeConnectAccountId: string | null;
  applicationFeeBps: number;
  featureFlags: Record<string, boolean>;
  createdAt: string;
  stores: Array<{ name: string; currency: string; supportEmail: string | null }>;
  domains: Array<{ id: string; hostname: string; verified: boolean; sslStatus: string }>;
  staff: Array<{
    id: string;
    email: string;
    name: string | null;
    role: string;
    lastLoginAt: string | null;
  }>;
  limits: { name: string; maxProducts: number | null; maxStaff: number | null };
  _count: { products: number; bookings: number; customers: number };
  gmvMinor: number;
  recentBookings: Array<{
    id: string;
    bookingNo: string;
    customerName: string;
    statusKey: string;
    totalMinor: number;
    currency: string;
    createdAt: string;
  }>;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: slug };
}

export default async function PlatformTenantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let tenant: TenantDetail;
  try {
    tenant = await serverGet<TenantDetail>(`/platform/tenants/${slug}`, { cache: "no-store" });
  } catch (err) {
    if (isApiError(err) && err.status === 404) notFound();
    throw err;
  }

  const audit = await getAuditLog(tenant.id);
  const store = tenant.stores[0];
  const currency = store?.currency ?? "USD";

  // The row-actions menu takes the list shape, so build it from the detail response.
  const asRow: PlatformTenant = {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    plan: tenant.plan,
    isSuspended: tenant.isSuspended,
    connectOnboarded: tenant.connectOnboarded,
    createdAt: tenant.createdAt,
    storeName: store?.name ?? null,
    currency,
    primaryDomain: tenant.domains.find((d) => d.verified)?.hostname ?? null,
    counts: { ...tenant._count, staff: tenant.staff.length },
    gmvMinor: tenant.gmvMinor,
    featureFlags: tenant.featureFlags,
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[{ label: "Tenants", href: "/platform/tenants" }, { label: tenant.name }]}
          />
        }
        title={tenant.name}
        status={
          <Badge tone={tenant.isSuspended ? "danger" : "success"}>
            {tenant.isSuspended ? "Suspended" : "Active"}
          </Badge>
        }
        description={
          <>
            {tenant.plan} plan · joined {new Date(tenant.createdAt).toLocaleDateString()}
          </>
        }
        action={<TenantRowActions tenant={asRow} />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Products" value={tenant._count.products} />
        <StatCard label="Bookings" value={tenant._count.bookings} />
        <StatCard label="Customers" value={tenant._count.customers} />
        <StatCard
          label="GMV"
          value={<Money amountMinor={tenant.gmvMinor} currency={currency} />}
        />
      </div>

      <DetailLayout
        aside={
          <>
            <Card>
              <CardHeader title="Account" />
              <DataList
                items={[
                  { label: "Slug", value: tenant.slug },
                  { label: "Plan", value: tenant.limits.name },
                  {
                    label: "Product limit",
                    value: tenant.limits.maxProducts ?? "Unlimited",
                  },
                  { label: "Staff limit", value: tenant.limits.maxStaff ?? "Unlimited" },
                  {
                    label: "Platform fee",
                    value: `${(tenant.applicationFeeBps / 100).toFixed(2)}%`,
                  },
                  {
                    label: "Payouts",
                    value: tenant.connectOnboarded ? "Connected" : "Not connected",
                  },
                  { label: "Currency", value: currency },
                  { label: "Support email", value: store?.supportEmail ?? "—" },
                ]}
              />
            </Card>

            <Card>
              <CardHeader title="Domains" />
              {tenant.domains.length === 0 ? (
                <p className="text-[13.5px] text-paper-mute">
                  Using {tenantSubdomain(tenant.slug)}
                </p>
              ) : (
                <ul className="space-y-2 text-[13.5px]">
                  {tenant.domains.map((domain) => (
                    <li key={domain.id} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate">{domain.hostname}</span>
                      <Badge tone={domain.verified ? "success" : "warning"}>
                        {domain.verified ? "Verified" : domain.sslStatus}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        }
      >
        <Card className="p-0">
          <div className="px-5 pt-5">
            <CardHeader title="Recent bookings" />
          </div>
          <TableContainer className="border-0 shadow-none">
            <Table>
              <THead>
                <Tr>
                  <Th>Booking</Th>
                  <Th>Customer</Th>
                  <Th>Status</Th>
                  <Th align="right">Total</Th>
                </Tr>
              </THead>
              <TBody>
                {tenant.recentBookings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10">
                      <EmptyState
                        title="No bookings yet"
                        description="This tenant has not taken a booking."
                      />
                    </td>
                  </tr>
                ) : (
                  tenant.recentBookings.map((booking) => (
                    <Tr key={booking.id}>
                      <Td>{booking.bookingNo}</Td>
                      <Td muted>{booking.customerName}</Td>
                      <Td>
                        <StatusBadge statusKey={booking.statusKey} />
                      </Td>
                      <Td numeric>
                        <Money amountMinor={booking.totalMinor} currency={booking.currency} />
                      </Td>
                    </Tr>
                  ))
                )}
              </TBody>
            </Table>
          </TableContainer>
        </Card>

        <Card>
          <CardHeader title="Staff" description="Who can sign in to this store." />
          {tenant.staff.length === 0 ? (
            <EmptyState
              title="No active staff"
              description="This store has nobody who can sign in, which will need fixing."
            />
          ) : (
            <ul className="divide-y divide-line-soft text-[13.5px]">
              {tenant.staff.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{member.name ?? member.email}</p>
                    <p className="truncate font-mono text-[11px] text-paper-faint">
                      {member.email}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge tone={member.role === "OWNER" ? "success" : "neutral"}>
                      {member.role}
                    </Badge>
                    <span className="font-mono text-[11px] text-paper-faint">
                      {member.lastLoginAt
                        ? new Date(member.lastLoginAt).toLocaleDateString()
                        : "Never"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Operator actions on this tenant"
            description="Suspensions, plan changes and support access."
          />
          {audit.length === 0 ? (
            <EmptyState
              title="Nothing recorded"
              description="No operator has acted on this tenant."
            />
          ) : (
            <ul className="divide-y divide-line-soft text-[13.5px]">
              {audit.map((entry) => (
                <li key={entry.id} className="flex items-baseline justify-between gap-3 py-2">
                  <span>{entry.action.replace(/[._]/g, " ")}</span>
                  <span className="shrink-0 font-mono text-[11px] text-paper-faint">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </DetailLayout>

      <p className="mt-8 text-center font-mono text-[11px] text-paper-faint">
        <Link href="/platform/tenants" className="hover:underline">
          ← All tenants
        </Link>
      </p>
    </Page>
  );
}
