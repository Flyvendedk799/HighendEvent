import { Badge, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { demoBookings } from "@/lib/demo-data";

export default function CustomerBookingsPage() {
  return (
    <main>
      <PageHeader title="Your bookings" description="History and upcoming rentals." />
      <div className="space-y-3">
        {demoBookings.map((booking) => (
          <Card key={booking.id} className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <div>
              <p className="font-medium">{booking.id}</p>
              <p className="text-sm text-muted-foreground">
                {booking.start} → {booking.end}
              </p>
            </div>
            <Badge tone="accent">{booking.status}</Badge>
            <p className="font-medium">{booking.total}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
