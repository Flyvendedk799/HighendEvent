import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataList,
  DateRange,
  EmptyState,
  Money,
  StatCard,
  StatusBadge,
} from "@rentora/ui";
import { LogoutButton } from "@/components/storefront/logout-button";
import { serverGet } from "@/lib/server-api";
import { requireCustomer } from "@/lib/session";
import { getBootstrap } from "@/lib/tenant";
import { getLocale, getT } from "@/lib/locale";
import type { Booking, Customer } from "@/lib/types";

export const metadata = { title: "Your account" };
export const dynamic = "force-dynamic";

export default async function AccountDashboardPage() {
  const session = await requireCustomer();

  const [bookings, customer, bootstrap, t, locale] = await Promise.all([
    serverGet<Booking[]>("/bookings/mine", { cache: "no-store" }).catch(() => [] as Booking[]),
    serverGet<Customer>(`/customers/${session.sub}`, { cache: "no-store" }).catch(() => null),
    getBootstrap(),
    getT(),
    getLocale(),
  ]);

  const currency = bootstrap?.store.currency ?? "USD";
  const today = new Date().toISOString().slice(0, 10);

  const upcoming = bookings.filter(
    (b) => b.endDate.slice(0, 10) >= today && b.statusKey !== "cancelled",
  );
  const outstanding = bookings.reduce(
    (sum, b) => sum + (b.statusKey === "cancelled" ? 0 : b.remainingMinor),
    0,
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {t.account.hello}, {session.name?.split(" ")[0] ?? ""}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{session.email}</p>
        </div>
        <LogoutButton label={t.account.logOut} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={t.account.upcoming} value={upcoming.length} />
        <StatCard label={t.account.totalBookings} value={bookings.length} />
        <StatCard
          label={t.account.balanceOwed}
          value={<Money amountMinor={outstanding} currency={currency} dashWhenZero />}
          hint={outstanding > 0 ? t.account.dueBefore : t.account.nothingOwed}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="p-0">
          <div className="px-5 pt-5">
            <CardHeader
              title={t.account.yourBookings}
              action={
                <Button variant="link" asChild>
                  <Link href="/account/bookings">{t.account.seeAll}</Link>
                </Button>
              }
            />
          </div>

          {bookings.length === 0 ? (
            <div className="px-5 pb-6">
              <EmptyState
                title={t.account.noBookingsTitle}
                description={t.account.noBookingsBody}
                action={
                  <Button asChild>
                    <Link href="/catalog">{t.cart.browse}</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {bookings.slice(0, 5).map((booking) => (
                <li key={booking.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{booking.bookingNo}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                      <DateRange
                        start={booking.startDate}
                        end={booking.endDate}
                        locale={locale}
                        showDays={false}
                      />
                      {" · "}
                      {booking.items.map((item) => item.nameSnapshot).join(", ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge statusKey={booking.statusKey} />
                    <span className="text-sm font-medium">
                      <Money
                        amountMinor={booking.totalMinor}
                        currency={booking.currency}
                        locale={locale}
                      />
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title={t.account.yourDetails} />
          <DataList
            items={[
              { label: t.checkout.fullName, value: session.name ?? "—" },
              { label: t.checkout.email, value: session.email },
              { label: t.checkout.phone, value: customer?.phone ?? "—" },
              {
                label: t.checkout.deliveryAddress,
                value: customer?.address
                  ? `${customer.address}, ${customer.zipCode ?? ""} ${customer.city ?? ""}`.trim()
                  : "—",
              },
            ]}
          />
          {bootstrap?.store.supportEmail ? (
            <p className="mt-4 text-xs text-[var(--color-muted-foreground)]">
              Need something changed?{" "}
              <a
                href={`mailto:${bootstrap.store.supportEmail}`}
                className="text-[var(--color-primary)] hover:underline"
              >
                Email us
              </a>
              .
            </p>
          ) : null}
        </Card>
      </div>

      {upcoming.length > 0 ? (
        <p className="mt-6 text-sm text-[var(--color-muted-foreground)]">
          <Badge tone="info">Next up</Badge>{" "}
          {upcoming[0]!.items.map((item) => item.nameSnapshot).join(", ")} on{" "}
          <DateRange
            start={upcoming[0]!.startDate}
            end={upcoming[0]!.endDate}
            locale={locale}
            showDays={false}
          />
        </p>
      ) : null}
    </div>
  );
}
