import Link from "next/link";
import {
  Badge,
  Banner,
  Button,
  Card,
  CardHeader,
  DateRange,
  EmptyState,
  Money,
  Page,
  PageHeader,
  Section,
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
import { serverGet } from "@/lib/server-api";
import { isApiError } from "@/lib/api";
import type { AnalyticsKpis, Booking, StorefrontBootstrap } from "@/lib/types";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayOf(value: string): string {
  return value.slice(0, 10);
}

/** Bookings the crew physically touches today: a departure, a return, or both. */
function todaysAgenda(bookings: Booking[]) {
  const today = isoToday();
  return bookings
    .filter((b) => dayOf(b.startDate) === today || dayOf(b.endDate) === today)
    .map((b) => ({
      booking: b,
      kind:
        dayOf(b.startDate) === today && dayOf(b.endDate) === today
          ? ("same-day" as const)
          : dayOf(b.startDate) === today
            ? ("out" as const)
            : ("in" as const),
    }));
}

/** Anything that would cost the tenant money or goodwill if it were missed. */
function needsAttention(bookings: Booking[]) {
  const today = isoToday();
  return bookings.filter(
    (b) =>
      (b.statusKey === "pending" && dayOf(b.startDate) <= today) ||
      (b.remainingMinor > 0 && dayOf(b.startDate) <= today) ||
      (b.statusKey === "out_for_delivery" && dayOf(b.endDate) < today),
  );
}

export default async function AdminOverviewPage() {
  const [kpis, bookings, bootstrap] = await Promise.all([
    serverGet<AnalyticsKpis>("/analytics/kpis", { cache: "no-store" }).catch(() => null),
    serverGet<Booking[]>("/bookings", { cache: "no-store" }).catch(() => [] as Booking[]),
    serverGet<StorefrontBootstrap>("/storefront/bootstrap").catch((err) => {
      if (isApiError(err)) return null;
      throw err;
    }),
  ]);

  const currency = bootstrap?.store.currency ?? "USD";
  const live = bookings.filter((b) => !b.isDeleted);
  const agenda = todaysAgenda(live);
  const attention = needsAttention(live);
  const recent = live.slice(0, 6);

  const setupIncomplete =
    bootstrap && (!bootstrap.features.hasProducts || !bootstrap.tenant.connectOnboarded);

  return (
    <Page>
      <PageHeader
        title="Overview"
        description="What is happening in your store today."
        action={
          <Button asChild>
            <Link href="/admin/bookings/new">New booking</Link>
          </Button>
        }
      />

      {setupIncomplete ? (
        <Banner
          tone="warning"
          title="Your store is not ready to take bookings yet"
          className="mb-6"
          action={
            <Button size="sm" variant="secondary" asChild>
              <Link href="/admin/go-live">Open checklist</Link>
            </Button>
          }
        >
          {!bootstrap.features.hasProducts
            ? "Add at least one product"
            : "Finish Stripe payouts onboarding"}{" "}
          before you share your storefront.
        </Banner>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue (all time)"
          value={<Money amountMinor={kpis?.revenueMinor ?? 0} currency={currency} />}
          hint="Excludes cancelled bookings"
        />
        <StatCard
          label="Bookings (30 days)"
          value={kpis?.bookingsLast30Days ?? 0}
          hint={`${kpis?.bookingsTotal ?? 0} all time`}
        />
        <StatCard
          label="Active products"
          value={kpis?.activeProducts ?? 0}
          hint={kpis?.activeProducts ? undefined : "Add inventory to start selling"}
        />
        <StatCard
          label="Customers"
          value={kpis?.activeCustomers ?? 0}
          hint="With an active account"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Section title="Today" description="Departures and returns for the crew.">
          <Card className="p-0">
            {agenda.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="Nothing scheduled today"
                  description="Departures and returns will appear here on the day."
                />
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {agenda.map(({ booking, kind }) => (
                  <li key={booking.id}>
                    <Link
                      href={`/admin/bookings/${booking.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--color-muted)]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{booking.customerName}</p>
                        <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                          {booking.bookingNo} ·{" "}
                          {booking.deliveryType === "DELIVERY" ? "Delivery" : "Pickup"}
                        </p>
                      </div>
                      <Badge
                        tone={kind === "in" ? "info" : kind === "out" ? "accent" : "warning"}
                      >
                        {kind === "in" ? "Returning" : kind === "out" ? "Going out" : "Out & back"}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Section>

        <Section title="Needs attention" description="Unpaid or overdue bookings.">
          <Card className="p-0">
            {attention.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="Nothing needs chasing"
                  description="Unpaid balances and overdue returns show up here."
                />
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {attention.slice(0, 6).map((booking) => (
                  <li key={booking.id}>
                    <Link
                      href={`/admin/bookings/${booking.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--color-muted)]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{booking.customerName}</p>
                        <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                          {booking.bookingNo} · starts {dayOf(booking.startDate)}
                        </p>
                      </div>
                      {booking.remainingMinor > 0 ? (
                        <span className="shrink-0 text-sm font-medium text-amber-700">
                          <Money amountMinor={booking.remainingMinor} currency={booking.currency} />{" "}
                          due
                        </span>
                      ) : (
                        <StatusBadge statusKey={booking.statusKey} />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Section>
      </div>

      <Section
        title="Recent bookings"
        action={
          <Button variant="link" asChild>
            <Link href="/admin/bookings">View all</Link>
          </Button>
        }
      >
        <TableContainer>
          <Table>
            <THead>
              <Tr>
                <Th>Booking</Th>
                <Th>Customer</Th>
                <Th>Dates</Th>
                <Th>Status</Th>
                <Th align="right">Total</Th>
              </Tr>
            </THead>
            <TBody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10">
                    <EmptyState
                      title="No bookings yet"
                      description="Bookings taken on your storefront and created by staff both land here."
                      action={
                        <Button asChild>
                          <Link href="/admin/bookings/new">Create a booking</Link>
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                recent.map((booking) => (
                  <Tr key={booking.id} interactive>
                    <Td>
                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className="font-medium hover:underline"
                      >
                        {booking.bookingNo}
                      </Link>
                    </Td>
                    <Td>{booking.customerName}</Td>
                    <Td muted>
                      <DateRange start={booking.startDate} end={booking.endDate} showDays={false} />
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
      </Section>
    </Page>
  );
}
