import Link from "next/link";
import { Badge, Banner, Button, DateRange, EmptyState, Money } from "@rentora/ui";
import { serverGet } from "@/lib/server-api";
import { getBootstrap } from "@/lib/tenant";
import { getSession } from "@/lib/session";

export const metadata = { title: "Booking confirmed" };
export const dynamic = "force-dynamic";

type Confirmation = {
  bookingNo: string;
  customerName: string;
  email: string;
  startDate: string;
  endDate: string;
  statusKey: string;
  deliveryType: "PICKUP" | "DELIVERY";
  address: string;
  zipCode: string;
  city: string;
  currency: string;
  subtotalMinor: number;
  taxMinor: number;
  depositMinor: number;
  deliveryFeeMinor: number;
  totalMinor: number;
  upfrontMinor: number;
  remainingMinor: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPriceMinor: number;
    upsells: Array<{ name: string; quantity: number; unitPriceMinor: number }>;
  }>;
};

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; stub?: string }>;
}) {
  const { session_id: sessionId, stub } = await searchParams;
  const [bootstrap, session] = await Promise.all([getBootstrap(), getSession()]);
  const locale = bootstrap?.store.localeDefault ?? "en";

  if (!sessionId) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <EmptyState
          title="Nothing to confirm"
          description="Open the link from your confirmation email, or check your bookings."
          action={
            <Button asChild>
              <Link href={session?.role === "customer" ? "/account/bookings" : "/catalog"}>
                {session?.role === "customer" ? "My bookings" : "Browse the catalog"}
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const booking = await serverGet<Confirmation>(
    `/checkout/confirmation?sessionId=${encodeURIComponent(sessionId)}`,
    { cache: "no-store" },
  ).catch(() => null);

  if (!booking) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <EmptyState
          title="We could not find that booking"
          description="If you have just paid, give it a moment and refresh. Otherwise get in touch and we will sort it out."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="m5 12 5 5L19 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">
          Thanks, {booking.customerName.split(" ")[0]}
        </h1>
        <p className="mt-2 text-[var(--color-muted-foreground)]">
          Your booking is <strong>{booking.bookingNo}</strong>. We sent the details to{" "}
          {booking.email}.
        </p>
      </div>

      {stub ? (
        <Banner tone="info" title="No payment was taken" className="mt-6">
          This store has not finished connecting its payment account, so nothing was charged. The
          team will be in touch to arrange payment.
        </Banner>
      ) : null}

      <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Your dates
            </p>
            <p className="mt-1 font-medium">
              <DateRange start={booking.startDate} end={booking.endDate} locale={locale} />
            </p>
          </div>
          <Badge tone={booking.remainingMinor > 0 ? "warning" : "success"}>
            {booking.remainingMinor > 0 ? "Deposit paid" : "Paid in full"}
          </Badge>
        </div>

        <div className="mt-5 border-t border-[var(--color-border)] pt-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {booking.deliveryType === "DELIVERY" ? "Delivering to" : "Collect from us"}
          </p>
          <p className="mt-1 text-sm">
            {booking.deliveryType === "DELIVERY"
              ? `${booking.address}, ${booking.zipCode} ${booking.city}`
              : "Bring this booking number when you collect."}
          </p>
        </div>

        <ul className="mt-5 space-y-2 border-t border-[var(--color-border)] pt-5 text-sm">
          {booking.items.map((item) => (
            <li key={item.name}>
              <div className="flex justify-between gap-3">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <Money
                  amountMinor={item.unitPriceMinor * item.quantity}
                  currency={booking.currency}
                  locale={locale}
                />
              </div>
              {item.upsells.map((upsell) => (
                <div
                  key={upsell.name}
                  className="flex justify-between gap-3 pl-4 text-xs text-[var(--color-muted-foreground)]"
                >
                  <span>+ {upsell.name}</span>
                  <Money
                    amountMinor={upsell.unitPriceMinor * upsell.quantity}
                    currency={booking.currency}
                    locale={locale}
                  />
                </div>
              ))}
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-1.5 border-t border-[var(--color-border)] pt-5 text-sm">
          {booking.deliveryFeeMinor > 0 ? (
            <Row
              label="Delivery"
              value={
                <Money
                  amountMinor={booking.deliveryFeeMinor}
                  currency={booking.currency}
                  locale={locale}
                />
              }
            />
          ) : null}
          {booking.depositMinor > 0 ? (
            <Row
              label="Refundable deposit"
              value={
                <Money
                  amountMinor={booking.depositMinor}
                  currency={booking.currency}
                  locale={locale}
                />
              }
            />
          ) : null}
          <div className="flex items-baseline justify-between border-t border-[var(--color-border)] pt-2">
            <dt className="font-semibold">Total</dt>
            <dd className="font-semibold">
              <Money amountMinor={booking.totalMinor} currency={booking.currency} locale={locale} />
            </dd>
          </div>
          {booking.remainingMinor > 0 ? (
            <Row
              label="Balance due before your dates"
              value={
                <Money
                  amountMinor={booking.remainingMinor}
                  currency={booking.currency}
                  locale={locale}
                />
              }
            />
          ) : null}
        </dl>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button variant="secondary" asChild>
          <Link href="/catalog">Keep browsing</Link>
        </Button>
        {session?.role === "customer" ? (
          <Button asChild>
            <Link href="/account/bookings">See my bookings</Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href="/account/register">Create an account to track this</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[var(--color-muted-foreground)]">{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}
