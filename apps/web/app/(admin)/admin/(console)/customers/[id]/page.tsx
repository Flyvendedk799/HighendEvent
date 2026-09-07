import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Badge,
  Breadcrumbs,
  Card,
  CardHeader,
  DataList,
  DateRange,
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
import { CustomerPrivacyActions } from "@/components/admin/customer-privacy-actions";
import { serverGet } from "@/lib/server-api";
import { isApiError } from "@/lib/api";
import type { Booking, Customer, StorefrontBootstrap } from "@/lib/types";

export const dynamic = "force-dynamic";

type History = {
  customer: Customer;
  bookings: Booking[];
  stats: {
    bookingCount: number;
    lifetimeValueMinor: number;
    outstandingMinor: number;
    firstBookingAt: string | null;
    lastBookingAt: string | null;
  };
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const customer = await serverGet<Customer>(`/customers/${id}`);
    return { title: `${customer.firstName} ${customer.lastName}` };
  } catch {
    return { title: "Customer" };
  }
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let history: History;
  try {
    history = await serverGet<History>(`/customers/${id}/history`, { cache: "no-store" });
  } catch (err) {
    if (isApiError(err) && err.status === 404) notFound();
    throw err;
  }

  const bootstrap = await serverGet<StorefrontBootstrap>("/storefront/bootstrap").catch(
    () => null,
  );
  const currency = bootstrap?.store.currency ?? "USD";
  const { customer, bookings, stats } = history;
  const name = `${customer.firstName} ${customer.lastName}`.trim();

  return (
    <Page>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[{ label: "Customers", href: "/admin/customers" }, { label: name }]}
          />
        }
        title={name}
        status={
          <Badge tone={customer.isGuest ? "neutral" : "success"}>
            {customer.isGuest ? "Guest checkout" : "Registered"}
          </Badge>
        }
        description={customer.email}
        action={<CustomerPrivacyActions customer={customer} />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Bookings" value={stats.bookingCount} />
        <StatCard
          label="Lifetime value"
          value={<Money amountMinor={stats.lifetimeValueMinor} currency={currency} />}
          hint="Excludes cancelled bookings"
        />
        <StatCard
          label="Outstanding"
          value={<Money amountMinor={stats.outstandingMinor} currency={currency} dashWhenZero />}
          hint={stats.outstandingMinor > 0 ? "Balance still to collect" : "Nothing owed"}
        />
      </div>

      <DetailLayout
        aside={
          <Card>
            <CardHeader title="Details" />
            <DataList
              items={[
                { label: "Email", value: customer.email },
                { label: "Phone", value: customer.phone ?? "—" },
                {
                  label: "Address",
                  value: customer.address
                    ? `${customer.address}, ${customer.zipCode ?? ""} ${customer.city ?? ""}`.trim()
                    : "—",
                },
                {
                  label: "Customer since",
                  value: new Date(customer.createdAt).toLocaleDateString(),
                },
                {
                  label: "Last login",
                  value: customer.lastLoginAt
                    ? new Date(customer.lastLoginAt).toLocaleDateString()
                    : "Never",
                },
              ]}
            />
          </Card>
        }
      >
        <Card className="p-0">
          <div className="px-5 pt-5">
            <CardHeader title="Booking history" />
          </div>
          <TableContainer className="rounded-none border-0 shadow-none">
            <Table>
              <THead>
                <Tr>
                  <Th>Booking</Th>
                  <Th>Dates</Th>
                  <Th>Status</Th>
                  <Th align="right">Total</Th>
                </Tr>
              </THead>
              <TBody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10">
                      <EmptyState
                        title="No bookings yet"
                        description="This customer has an account but has not booked anything."
                      />
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <Tr key={booking.id} interactive>
                      <Td>
                        <Link
                          href={`/admin/bookings/${booking.id}`}
                          className="font-medium hover:underline"
                        >
                          {booking.bookingNo}
                        </Link>
                      </Td>
                      <Td muted>
                        <DateRange
                          start={booking.startDate}
                          end={booking.endDate}
                          showDays={false}
                        />
                      </Td>
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
      </DetailLayout>
    </Page>
  );
}
