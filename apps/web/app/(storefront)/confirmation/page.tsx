import Link from "next/link";
import { Badge, Banner, Button, DateRange, EmptyState, Money } from "@rentora/ui";
import { serverGet } from "@/lib/server-api";
import { getSession } from "@/lib/session";
import { getLocale, getT } from "@/lib/locale";

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
  const [session, t, locale] = await Promise.all([getSession(), getT(), getLocale()]);

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
        <span className="inline-flex h-12 w-12 items-center justify-center bg-signal text-signal-ink">
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
        <h1 className="mt-6 text-[clamp(28px,4.2vw,46px)] font-semibold leading-[0.98] tracking-[-0.04em]">
          {t.confirmation.thanks}, {booking.customerName.split(" ")[0]}
        </h1>
        <p className="mt-2 text-paper-mute">
          {t.confirmation.bookingIs} <span className="font-mono text-paper">{booking.bookingNo}</span>. {t.confirmation.sentTo}{" "}
          {booking.email}.
        </p>
      </div>

      {stub ? (
        <Banner tone="info" title="No payment was taken" className="mt-6">
          This store has not finished connecting its payment account, so nothing was charged. The
          team will be in touch to arrange payment.
        </Banner>
      ) : null}

      <div className="mt-9 border border-line-raised bg-ink-raised p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper-faint">
              {t.confirmation.yourDates}
            </p>
            <p className="mt-1 font-medium">
              <DateRange start={booking.startDate} end={booking.endDate} locale={locale} />
            </p>
          </div>
          <Badge tone={booking.remainingMinor > 0 ? "warning" : "success"}>
            {booking.remainingMinor > 0 ? t.confirmation.depositPaid : t.confirmation.paidInFull}
          </Badge>
        </div>

        <div className="mt-5 border-t border-line-soft pt-5">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper-faint">
            {booking.deliveryType === "DELIVERY" ? t.confirmation.deliveringTo : t.confirmation.collectFromUs}
          </p>
          <p className="mt-1 text-[13.5px]">
            {booking.deliveryType === "DELIVERY"
              ? `${booking.address}, ${booking.zipCode} ${booking.city}`
              : t.confirmation.collectPrompt}
          </p>
        </div>

        <ul className="mt-5 space-y-2.5 border-t border-line-soft pt-5 text-[13.5px]">
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
                  className="flex justify-between gap-3 pl-4 text-[11.5px] text-paper-faint"
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

        <dl className="mt-5 flex flex-col gap-2.5 border-t border-line-soft pt-5 text-[13px]">
          {booking.deliveryFeeMinor > 0 ? (
            <Row
              label={t.common.delivery}
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
              label={t.common.deposit}
              value={
                <Money
                  amountMinor={booking.depositMinor}
                  currency={booking.currency}
                  locale={locale}
                />
              }
            />
          ) : null}
          <div className="mt-1 flex items-baseline justify-between border-t border-line-soft pt-3">
            <dt className="text-paper">{t.common.total}</dt>
            <dd className="font-semibold">
              <Money amountMinor={booking.totalMinor} currency={booking.currency} locale={locale} />
            </dd>
          </div>
          {booking.remainingMinor > 0 ? (
            <Row
              label={t.confirmation.balanceDue}
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

      <div className="mt-7 flex flex-wrap justify-center gap-2.5">
        <Button variant="secondary" asChild>
          <Link href="/catalog">{t.nav.keepBrowsing}</Link>
        </Button>
        {session?.role === "customer" ? (
          <Button asChild>
            <Link href="/account/bookings">{t.confirmation.seeBookings}</Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href="/account/register">{t.confirmation.createAccount}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-paper-mute">{label}</dt>
      <dd className="font-mono text-[12.5px] tabular-nums text-paper-dim">{value}</dd>
    </div>
  );
}
