import Link from "next/link";
import { Badge, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { demoBookings } from "@/lib/demo-data";

export default function CustomerDashboardPage() {
  return (
    <main>
      <PageHeader
        title="Your dashboard"
        description="Track upcoming rentals and profile details."
        action={
          <Link href="/account/bookings" className="text-sm font-medium text-primary hover:underline">
            All bookings →
          </Link>
        }
      />
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <p className="text-sm text-muted-foreground">Upcoming</p>
          <p className="mt-2 font-display text-3xl font-semibold">2</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="mt-2 font-display text-3xl font-semibold">11</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Open balance</p>
          <p className="mt-2 font-display text-3xl font-semibold">0 DKK</p>
        </Card>
      </div>
      <div className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-semibold">Recent bookings</h2>
        {demoBookings.map((booking) => (
          <Card key={booking.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{booking.id}</p>
              <p className="text-sm text-muted-foreground">
                {booking.start} → {booking.end}
              </p>
            </div>
            <Badge tone="success">{booking.status}</Badge>
          </Card>
        ))}
      </div>
    </main>
  );
}
