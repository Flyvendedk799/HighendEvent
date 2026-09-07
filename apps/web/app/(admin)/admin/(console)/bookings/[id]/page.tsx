import Link from "next/link";
import { Badge, Button, Card, CardHeader } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main>
      <PageHeader
        title={`Booking ${id}`}
        description="Timeline, line items, payments, and fulfillment."
        action={
          <Link href="/admin/bookings">
            <Button variant="secondary">Back to list</Button>
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-4">
          <CardHeader title="Line items" />
          <div className="flex justify-between border-b border-border py-3 text-sm">
            <span>Champagne Tower × 1 · 2 days</span>
            <span>1.780 DKK</span>
          </div>
          <div className="flex justify-between border-b border-border py-3 text-sm">
            <span>Delivery zone B</span>
            <span>450 DKK</span>
          </div>
          <div className="flex justify-between py-3 font-semibold">
            <span>Total</span>
            <span>4.280 DKK</span>
          </div>
        </Card>
        <Card className="space-y-3">
          <CardHeader title="Status" action={<Badge tone="success">Confirmed</Badge>} />
          <p className="text-sm text-muted-foreground">Customer: Maja Nielsen</p>
          <p className="text-sm text-muted-foreground">Source: Online</p>
          <p className="text-sm text-muted-foreground">Payment: Deposit paid</p>
          <Button className="w-full" variant="secondary">
            Mark out for delivery
          </Button>
        </Card>
      </div>
    </main>
  );
}
