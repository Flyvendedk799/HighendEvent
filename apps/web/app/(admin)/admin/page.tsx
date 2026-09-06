import { Badge, Card, CardHeader } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { demoBookings } from "@/lib/demo-data";

const kpis = [
  { label: "Revenue (30d)", value: "128.4k DKK" },
  { label: "Bookings", value: "64" },
  { label: "Utilization", value: "78%" },
  { label: "Open deliveries", value: "9" },
];

export default function AdminDashboardPage() {
  return (
    <main>
      <PageHeader
        title="Dashboard"
        description="Live snapshot of bookings, revenue, and operational load."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold">{kpi.value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Today's schedule" description="Pickups, deliveries, and returns." />
          <ul className="space-y-3 text-sm">
            {["09:00 Delivery · BK-1038", "11:30 Pickup · BK-1040", "15:00 Return · BK-1029"].map(
              (row) => (
                <li key={row} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                  {row}
                  <Badge tone="accent">Ops</Badge>
                </li>
              ),
            )}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Recent bookings" />
          <ul className="space-y-3 text-sm">
            {demoBookings.map((b) => (
              <li key={b.id} className="flex items-center justify-between">
                <span>
                  {b.id} · {b.customer}
                </span>
                <Badge tone="success">{b.status}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </main>
  );
}
