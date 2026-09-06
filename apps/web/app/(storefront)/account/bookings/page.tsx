import { Badge, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { getTenantSlug } from "@/lib/tenant";

type BookingRow = {
  id: string;
  bookingNo: string;
  statusKey: string;
  startDate: string;
  endDate: string;
  totalMinor: number;
  currency: string;
};

export default async function CustomerBookingsPage() {
  const slug = await getTenantSlug();
  let bookings: BookingRow[] = [];
  try {
    bookings = await api.get<BookingRow[]>("/bookings/mine", {
      tenantSlug: slug,
      cache: "no-store",
    });
  } catch {
    bookings = [];
  }

  return (
    <main>
      <PageHeader title="Your bookings" description="History and upcoming rentals." />
      <div className="space-y-3">
        {bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bookings yet.</p>
        ) : (
          bookings.map((booking) => (
            <Card
              key={booking.id}
              className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center"
            >
              <div>
                <p className="font-medium">{booking.bookingNo}</p>
                <p className="text-sm text-muted-foreground">
                  {String(booking.startDate).slice(0, 10)} → {String(booking.endDate).slice(0, 10)}
                </p>
              </div>
              <Badge tone="accent">{booking.statusKey}</Badge>
              <p className="font-medium">{formatMoney(booking.totalMinor, booking.currency)}</p>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
