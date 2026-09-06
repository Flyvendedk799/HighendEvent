import Link from "next/link";
import { Badge, Button, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { demoBookings } from "@/lib/demo-data";

export default function AdminBookingsPage() {
  return (
    <main>
      <PageHeader
        title="Bookings"
        description="Online and manual rental orders."
        action={
          <Link href="/admin/bookings/new">
            <Button>Create manual booking</Button>
          </Link>
        }
      />
      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/60 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Dates</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {demoBookings.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/bookings/${b.id}`} className="font-medium text-primary hover:underline">
                    {b.id}
                  </Link>
                </td>
                <td className="px-4 py-3">{b.customer}</td>
                <td className="px-4 py-3">
                  {b.start} → {b.end}
                </td>
                <td className="px-4 py-3">{b.total}</td>
                <td className="px-4 py-3">
                  <Badge tone="success">{b.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
