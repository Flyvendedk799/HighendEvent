import Link from "next/link";
import { headers } from "next/headers";
import { Badge, Button, Card, EmptyState } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";

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

async function loadBookings(tenantSlug: string) {
  try {
    return await api.get<BookingRow[]>("/bookings", { tenantSlug, cache: "no-store" });
  } catch {
    return [] as BookingRow[];
  }
}

export default async function AdminBookingsPage() {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "demo";
  const bookings = await loadBookings(tenantSlug);

  return (
    <main>
      <PageHeader
        title="Bookings"
        description="Online and manual rental orders from the live API."
        action={
          <Link href="/admin/bookings/new">
            <Button>Create manual booking</Button>
          </Link>
        }
      />
      {bookings.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          description="Create a manual booking or complete a storefront checkout to populate this list."
          action={
            <Link href="/admin/bookings/new">
              <Button>Create booking</Button>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Booking</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {b.bookingNo}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{b.customerName}</td>
                  <td className="px-4 py-3">
                    {String(b.startDate).slice(0, 10)} → {String(b.endDate).slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">{money(b.totalMinor, b.currency)}</td>
                  <td className="px-4 py-3">
                    <Badge tone="success">{b.statusKey}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  );
}
