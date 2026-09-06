import Link from "next/link";
import { headers } from "next/headers";
import { Badge, Button, Card, CardHeader } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { BookingStatusActions } from "./booking-status-actions";
import { BookingOpsPanel } from "./booking-ops-panel";

type PaymentEntry = {
  id: string;
  kind: string;
  label: string;
  amountMinor: number | null;
  currency: string;
  status: string;
  reference: string | null;
  at: string;
};

type BookingDetail = {
  id: string;
  bookingNo: string;
  statusKey: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  zipCode: string;
  city: string;
  source: string;
  startDate: string;
  endDate: string;
  currency: string;
  subtotalMinor: number;
  taxMinor: number;
  depositMinor: number;
  deliveryFeeMinor: number;
  totalMinor: number;
  upfrontMinor: number;
  remainingMinor: number;
  deliveryType: string;
  notes: string | null;
  internalNotes: string | null;
  payments?: PaymentEntry[];
  items: Array<{
    id: string;
    quantity: number;
    unitPriceMinor: number;
    nameSnapshot: string;
    product?: { name: string } | null;
  }>;
};

async function loadBooking(id: string, tenantSlug: string) {
  try {
    return await api.get<BookingDetail>(`/bookings/${id}`, {
      tenantSlug,
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "demo";
  const booking = await loadBooking(id, tenantSlug);

  if (!booking) {
    return (
      <main>
        <PageHeader title="Booking not found" description={`No booking for id ${id}.`} />
        <Link href="/admin/bookings">
          <Button variant="secondary">Back to list</Button>
        </Link>
      </main>
    );
  }

  const start = String(booking.startDate).slice(0, 10);
  const end = String(booking.endDate).slice(0, 10);

  return (
    <main>
      <PageHeader
        title={booking.bookingNo}
        description={`${booking.customerName} · ${start} → ${end}`}
        action={
          <Link href="/admin/bookings">
            <Button variant="secondary">Back to list</Button>
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-4 lg:col-span-2">
          <CardHeader title="Line items" />
          {booking.items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between border-b border-border py-3 text-sm last:border-0"
            >
              <span>
                {item.nameSnapshot || item.product?.name || "Item"} × {item.quantity}
              </span>
              <span>
                {formatMoney(item.unitPriceMinor * item.quantity, booking.currency)}
              </span>
            </div>
          ))}
          <div className="space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(booking.subtotalMinor, booking.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatMoney(booking.taxMinor, booking.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span>{formatMoney(booking.deliveryFeeMinor, booking.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deposit</span>
              <span>{formatMoney(booking.depositMinor, booking.currency)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatMoney(booking.totalMinor, booking.currency)}</span>
            </div>
          </div>
          <BookingOpsPanel
            bookingId={booking.id}
            tenantSlug={tenantSlug}
            notes={booking.notes}
            internalNotes={booking.internalNotes}
            remainingMinor={booking.remainingMinor}
            currency={booking.currency}
            statusKey={booking.statusKey}
            payments={booking.payments ?? []}
          />
        </Card>
        <Card className="space-y-3">
          <CardHeader title="Status" action={<Badge tone="success">{booking.statusKey}</Badge>} />
          <p className="text-sm text-muted-foreground">Source: {booking.source}</p>
          <p className="text-sm text-muted-foreground">Fulfillment: {booking.deliveryType}</p>
          <p className="text-sm text-muted-foreground">
            Due now: {formatMoney(booking.upfrontMinor, booking.currency)}
          </p>
          <p className="text-sm text-muted-foreground">
            Remaining: {formatMoney(booking.remainingMinor, booking.currency)}
          </p>
          <div className="border-t border-border pt-3 text-sm">
            <p className="font-medium">{booking.customerName}</p>
            <p className="text-muted-foreground">{booking.email}</p>
            <p className="text-muted-foreground">{booking.phone}</p>
            <p className="text-muted-foreground">
              {booking.address}, {booking.zipCode} {booking.city}
            </p>
          </div>
          <BookingStatusActions
            bookingId={booking.id}
            statusKey={booking.statusKey}
            tenantSlug={tenantSlug}
          />
        </Card>
      </div>
    </main>
  );
}
