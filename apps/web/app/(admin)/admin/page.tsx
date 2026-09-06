import Link from "next/link";
import { headers } from "next/headers";
import { Badge, Card, CardHeader } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";

type Kpis = {
  bookingsTotal: number;
  bookingsLast30Days: number;
  revenueMinor: number;
  depositsMinor: number;
  activeCustomers: number;
  activeProducts: number;
  bookingsByStatus: Array<{ statusKey: string; count: number }>;
};

type BookingRow = {
  id: string;
  bookingNo: string;
  customerName: string;
  statusKey: string;
  totalMinor: number;
  currency: string;
  startDate: string;
  endDate: string;
};

function money(minor: number, currency = "DKK") {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

async function loadDashboard(tenantSlug: string) {
  try {
    const [kpis, bookings] = await Promise.all([
      api.get<Kpis>("/analytics/kpis", { tenantSlug, cache: "no-store" }),
      api.get<BookingRow[]>("/bookings", { tenantSlug, cache: "no-store" }),
    ]);
    return { kpis, bookings: bookings.slice(0, 6) };
  } catch {
    return { kpis: null as Kpis | null, bookings: [] as BookingRow[] };
  }
}

export default async function AdminDashboardPage() {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "demo";
  const { kpis, bookings } = await loadDashboard(tenantSlug);

  const cards = [
    { label: "Revenue (bookings)", value: kpis ? money(kpis.revenueMinor) : "—" },
    { label: "Bookings (30d)", value: kpis ? String(kpis.bookingsLast30Days) : "—" },
    { label: "Active products", value: kpis ? String(kpis.activeProducts) : "—" },
    { label: "Active customers", value: kpis ? String(kpis.activeCustomers) : "—" },
  ];

  return (
    <main>
      <PageHeader
        title="Dashboard"
        description="Live snapshot of bookings, revenue, and operational load."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((kpi) => (
          <Card key={kpi.label}>
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold">{kpi.value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Status mix" description="Open bookings by status key." />
          <ul className="space-y-3 text-sm">
            {(kpis?.bookingsByStatus ?? []).length === 0 ? (
              <li className="rounded-lg bg-muted px-3 py-2 text-muted-foreground">
                No booking status data yet.
              </li>
            ) : (
              kpis!.bookingsByStatus.map((row) => (
                <li
                  key={row.statusKey}
                  className="flex items-center justify-between rounded-lg bg-muted px-3 py-2"
                >
                  <span>{row.statusKey}</span>
                  <Badge tone="accent">{row.count}</Badge>
                </li>
              ))
            )}
          </ul>
        </Card>
        <Card>
          <CardHeader
            title="Recent bookings"
            action={
              <Link href="/admin/bookings" className="text-sm font-medium text-primary hover:underline">
                View all
              </Link>
            }
          />
          <ul className="space-y-3 text-sm">
            {bookings.length === 0 ? (
              <li className="rounded-lg bg-muted px-3 py-2 text-muted-foreground">
                No bookings yet — or sign in so the API can authorize staff reads.
              </li>
            ) : (
              bookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3">
                  <div>
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className="font-medium hover:text-primary"
                    >
                      {b.bookingNo}
                    </Link>
                    <p className="text-muted-foreground">
                      {b.customerName} · {String(b.startDate).slice(0, 10)} →{" "}
                      {String(b.endDate).slice(0, 10)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge tone="success">{b.statusKey}</Badge>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {money(b.totalMinor, b.currency)}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </main>
  );
}
