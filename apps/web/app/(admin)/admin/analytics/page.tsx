import { Badge, Card, CardHeader } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";

type Kpis = {
  bookingsTotal: number;
  bookingsLast30Days: number;
  revenueMinor: number;
  depositsMinor: number;
  activeCustomers: number;
  activeProducts: number;
  avgOrderMinor: number;
  bookingsByStatus: Array<{ statusKey: string; count: number }>;
};

type RevenueSeries = {
  weeks: Array<{ weekStart: string; revenueMinor: number; bookings: number }>;
};

type Utilization = {
  products: Array<{
    productId: string;
    name: string;
    quantityRented: number;
    revenueMinor: number;
    stockQty: number;
  }>;
};

export default async function AdminAnalyticsPage() {
  let kpis: Kpis | null = null;
  let series: RevenueSeries | null = null;
  let utilization: Utilization | null = null;
  try {
    [kpis, series, utilization] = await Promise.all([
      api.get<Kpis>("/analytics/kpis", { cache: "no-store" }),
      api.get<RevenueSeries>("/analytics/revenue-series", { cache: "no-store" }),
      api.get<Utilization>("/analytics/utilization", { cache: "no-store" }),
    ]);
  } catch {
    kpis = null;
  }

  const maxRevenue = Math.max(1, ...(series?.weeks.map((w) => w.revenueMinor) ?? [1]));

  return (
    <main>
      <PageHeader
        title="Analytics"
        description="Live revenue, bookings, and product utilization for this tenant."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Revenue", formatMoney(kpis?.revenueMinor ?? 0)],
          ["Bookings (30d)", String(kpis?.bookingsLast30Days ?? 0)],
          ["Avg order", formatMoney(kpis?.avgOrderMinor ?? 0)],
          ["Active products", String(kpis?.activeProducts ?? 0)],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Revenue · last 12 weeks"
            description="From paid/non-cancelled bookings"
          />
          <div className="flex h-48 items-end gap-2">
            {(series?.weeks ?? []).map((w) => (
              <div key={w.weekStart} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-teal-800 to-teal-400"
                  style={{ height: `${Math.max(4, (w.revenueMinor / maxRevenue) * 100)}%` }}
                  title={`${w.weekStart}: ${formatMoney(w.revenueMinor)}`}
                />
              </div>
            ))}
          </div>
        </Card>
        <Card className="space-y-3">
          <CardHeader title="By status" />
          {(kpis?.bookingsByStatus ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            kpis!.bookingsByStatus.map((row) => (
              <div key={row.statusKey} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{row.statusKey}</span>
                <Badge tone="accent">{row.count}</Badge>
              </div>
            ))
          )}
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader title="Top products · 30 days" description="By rental revenue" />
        <ul className="divide-y divide-border text-sm">
          {(utilization?.products ?? []).length === 0 ? (
            <li className="py-3 text-muted-foreground">No utilization data yet.</li>
          ) : (
            utilization!.products.map((p) => (
              <li
                key={p.productId}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <span className="font-medium">{p.name}</span>
                <span className="text-muted-foreground">
                  {p.quantityRented} rented · stock {p.stockQty} · {formatMoney(p.revenueMinor)}
                </span>
              </li>
            ))
          )}
        </ul>
      </Card>
    </main>
  );
}
