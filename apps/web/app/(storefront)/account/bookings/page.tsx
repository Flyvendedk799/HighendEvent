import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  DateRange,
  EmptyState,
  Money,
  StatusBadge,
} from "@rentora/ui";
import { serverGet } from "@/lib/server-api";
import { requireCustomer } from "@/lib/session";
import { getBootstrap } from "@/lib/tenant";
import { getLocale, getT } from "@/lib/locale";
import type { Booking } from "@/lib/types";

export const metadata = { title: "Your bookings" };
export const dynamic = "force-dynamic";

export default async function AccountBookingsPage() {
  await requireCustomer();

  const [bookings, t, locale] = await Promise.all([
    serverGet<Booking[]>("/bookings/mine", { cache: "no-store" }).catch(() => [] as Booking[]),
    getT(),
    getLocale(),
  ]);

  if (bookings.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-12">
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
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t.account.yourBookings}</h1>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {bookings.length} booking{bookings.length === 1 ? "" : "s"}
      </p>

      <ul className="mt-6 space-y-4">
        {bookings.map((booking) => (
          <li key={booking.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold">{booking.bookingNo}</p>
                  <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
                    <DateRange
                      start={booking.startDate}
                      end={booking.endDate}
                      locale={locale}
                    />
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={booking.deliveryType === "DELIVERY" ? "info" : "neutral"}>
                    {booking.deliveryType === "DELIVERY" ? t.common.delivery : t.common.collection}
                  </Badge>
                  <StatusBadge statusKey={booking.statusKey} />
                </div>
              </div>

              <ul className="mt-4 space-y-1 border-t border-[var(--color-border)] pt-4 text-sm">
                {booking.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span>
                      {item.nameSnapshot} × {item.quantity}
                    </span>
                    <Money
                      amountMinor={item.unitPriceMinor * item.quantity}
                      currency={booking.currency}
                      locale={locale}
                    />
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
                <div className="text-sm">
                  <span className="text-[var(--color-muted-foreground)]">{t.common.total} </span>
                  <span className="font-semibold">
                    <Money
                      amountMinor={booking.totalMinor}
                      currency={booking.currency}
                      locale={locale}
                    />
                  </span>
                </div>
                {booking.remainingMinor > 0 ? (
                  <p className="text-sm font-medium text-amber-700">
                    <Money
                      amountMinor={booking.remainingMinor}
                      currency={booking.currency}
                      locale={locale}
                    />{" "}
                    due before your dates
                  </p>
                ) : (
                  <p className="text-sm text-[var(--color-muted-foreground)]">Paid in full</p>
                )}
              </div>

              {booking.notes ? (
                <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
                  Your note: {booking.notes}
                </p>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
