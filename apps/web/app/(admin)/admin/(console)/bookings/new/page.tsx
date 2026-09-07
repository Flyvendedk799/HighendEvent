"use client";

import Link from "next/link";
import { Button, Card, Input } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

export default function AdminBookingCreatePage() {
  return (
    <main>
      <PageHeader
        title="Create manual booking"
        description="For phone / walk-in orders with custom pricing."
      />
      <form className="grid max-w-3xl gap-6">
        <Card className="grid gap-4 sm:grid-cols-2">
          <Input name="customer" label="Customer name" placeholder="Event House ApS" />
          <Input name="email" type="email" label="Email" placeholder="hello@eventhouse.dk" />
          <Input name="start" type="date" label="Start date" />
          <Input name="end" type="date" label="End date" />
          <Input name="product" label="Product" placeholder="Champagne Tower" />
          <Input name="qty" type="number" label="Quantity" defaultValue={1} />
          <Input name="total" label="Manual total (DKK)" placeholder="4280" />
          <Input name="notes" label="Internal notes" placeholder="Deposit waived" />
        </Card>
        <div className="flex gap-3">
          <Link href="/admin/bookings/BK-1042">
            <Button type="button">Save booking</Button>
          </Link>
          <Link href="/admin/bookings">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </main>
  );
}
