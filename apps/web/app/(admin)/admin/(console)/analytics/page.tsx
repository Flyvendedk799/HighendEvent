import {
  Banner,
  Card,
  CardHeader,
  Money,
  Page,
  PageHeader,
  StatCard,
  formatMoneyMinor,
} from "@rentora/ui";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";
import { serverGet } from "@/lib/server-api";
import type { AnalyticsKpis, StorefrontBootstrap } from "@/lib/types";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

type Kpis = AnalyticsKpis & {
  bookingsPrevious30Days: number;
  revenueLast30DaysMinor: number;
  outstandingMinor: number;
  averageBookingMinor: number;
};

export type RevenuePoint = { month: string; revenueMinor: number; bookings: number };

export type UtilisationRow = {
  productId: string;
  name: string;
  stockQty: number;
  bookings: number;
  rentedUnitDays: number;
  availableUnitDays: number;
  utilisationBps: number;
  revenueMinor: number;
};

export type Conversion = {
  windowDays: number;
  cartsStarted: number;
  bookingsCreated: number;
  bookingsPaid: number;
  bookingsCancelled: number;
  cartToBookingBps: number;
  bookingToPaidBps: number;
};

export type WeekdayLoad = Array<{ label: string; count: number }>;

export default async function AdminAnalyticsPage() {
  const [kpis, revenue, utilisation, conversion, weekday, pairs, bootstrap] = await Promise.all([
    serverGet<Kpis>("/analytics/kpis", { cache: "no-store" }),
    serverGet<RevenuePoint[]>("/analytics/revenue?months=12", { cache: "no-store" }).catch(
      () => [] as RevenuePoint[],
    ),
    serverGet<UtilisationRow[]>("/analytics/utilisation?days=90", { cache: "no-store" }).catch(
      () => [] as UtilisationRow[],
    ),
    serverGet<Conversion>("/analytics/conversion?days=30", { cache: "no-store" }).catch(
      () => null,
    ),
    serverGet<WeekdayLoad>("/analytics/weekday-load?days=90", { cache: "no-store" }).catch(
      () => [] as WeekdayLoad,
    ),
    serverGet<Array<{ names: [string, string]; count: number }>>("/analytics/pairs", {
      cache: "no-store",
    }).catch(() => []),
    serverGet<StorefrontBootstrap>("/storefront/bootstrap").catch(() => null),
  ]);

  const currency = bootstrap?.store.currency ?? "USD";
  const locale = bootstrap?.store.localeDefault ?? "en";

  const change =
    kpis.bookingsPrevious30Days > 0
      ? Math.round(
          ((kpis.bookingsLast30Days - kpis.bookingsPrevious30Days) /
            kpis.bookingsPrevious30Days) *
            100,
        )
      : null;

  const hasHistory = revenue.some((point) => point.revenueMinor > 0);

  return (
    <Page>
      <PageHeader
        title="Analytics"
        description="Everything here is counted from your own bookings. Nothing is estimated."
      />

      {!hasHistory ? (
        <Banner tone="info" className="mb-6">
          Charts fill in as bookings come through. Until then most of this reads zero, which is
          the honest answer.
        </Banner>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue (30 days)"
          value={<Money amountMinor={kpis.revenueLast30DaysMinor} currency={currency} />}
          hint={`${formatMoneyMinor(kpis.revenueMinor, currency, locale)} all time`}
        />
        <StatCard
          label="Bookings (30 days)"
          value={kpis.bookingsLast30Days}
          hint={
            change === null
              ? "No prior period to compare with"
              : `${change >= 0 ? "+" : ""}${change}% vs the 30 days before`
          }
        />
        <StatCard
          label="Average booking"
          value={<Money amountMinor={kpis.averageBookingMinor} currency={currency} />}
          hint="Across every booking you have taken"
        />
        <StatCard
          label="Outstanding"
          value={<Money amountMinor={kpis.outstandingMinor} currency={currency} dashWhenZero />}
          hint={kpis.outstandingMinor > 0 ? "Balances still to collect" : "Everything is settled"}
        />
      </div>

      <AnalyticsCharts
        revenue={revenue}
        utilisation={utilisation}
        conversion={conversion}
        weekday={weekday}
        currency={currency}
        locale={locale}
      />

      {pairs.length > 0 ? (
        <Card className="mt-6">
          <CardHeader
            title="Booked together"
            description="Items that regularly appear on the same booking — worth bundling."
          />
          <ul className="space-y-1.5 text-sm">
            {pairs.map((pair) => (
              <li key={pair.names.join()} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">
                  {pair.names[0]} + {pair.names[1]}
                </span>
                <span className="shrink-0 tabular text-[var(--color-muted-foreground)]">
                  {pair.count} booking{pair.count === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </Page>
  );
}
