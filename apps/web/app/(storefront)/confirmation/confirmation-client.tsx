"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, Button, Card } from "@rentora/ui";
import { clientApi } from "@/lib/client-api";
import { getDictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";

type BookingView = {
  id: string;
  bookingNo: string;
  statusKey: string;
  customerName: string;
  startDate: string;
  endDate: string;
  totalMinor: number;
  upfrontMinor: number;
  currency: string;
};

export function ConfirmationClient() {
  const t = getDictionary("en");
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        if (!sessionId) throw new Error("Missing session_id");

        let data: BookingView;
        if (sessionId.startsWith("cs_test_stub_")) {
          data = await clientApi<BookingView>("/checkout/complete-stub", {
            method: "POST",
            body: JSON.stringify({ sessionId }),
          });
        } else {
          data = await clientApi<BookingView>(
            `/checkout/session/${encodeURIComponent(sessionId)}`,
          );
        }
        if (!cancelled) setBooking(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load confirmation");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-xl py-10 text-center text-muted-foreground">
        Confirming booking…
      </main>
    );
  }

  if (error || !booking) {
    return (
      <main className="mx-auto max-w-xl py-10 text-center">
        <h1 className="font-display text-3xl font-semibold">Payment received?</h1>
        <p className="mt-3 text-muted-foreground">
          {error ?? "We could not load this booking confirmation."}
        </p>
        <Link href="/catalog" className="mt-6 inline-block">
          <Button>Back to catalog</Button>
        </Link>
      </main>
    );
  }

  const start = String(booking.startDate).slice(0, 10);
  const end = String(booking.endDate).slice(0, 10);

  return (
    <main className="mx-auto max-w-xl py-10 text-center">
      <Badge tone="success">{booking.statusKey}</Badge>
      <h1 className="mt-4 font-display text-4xl font-semibold">{t.confirmation.title}</h1>
      <p className="mt-3 text-muted-foreground">{t.confirmation.subtitle}</p>
      <Card className="mt-8 space-y-3 text-left text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Booking</span>
          <span className="font-medium">{booking.bookingNo}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Customer</span>
          <span className="font-medium">{booking.customerName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Dates</span>
          <span className="font-medium">
            {start}
            {end !== start ? ` → ${end}` : ""}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Paid now</span>
          <span className="font-medium">
            {formatMoney(booking.upfrontMinor, booking.currency)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total</span>
          <span className="font-medium">
            {formatMoney(booking.totalMinor, booking.currency)}
          </span>
        </div>
      </Card>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/account/bookings">
          <Button>View bookings</Button>
        </Link>
        <Link href="/catalog">
          <Button variant="secondary">Continue browsing</Button>
        </Link>
      </div>
    </main>
  );
}
