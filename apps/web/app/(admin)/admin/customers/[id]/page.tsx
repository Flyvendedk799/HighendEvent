"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Button, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { clientApi } from "@/lib/client-api";

type Customer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  address: string | null;
  zipCode: string | null;
  city: string | null;
  country: string | null;
  isGuest: boolean;
  isActive: boolean;
  createdAt: string;
};

type BookingRow = {
  id: string;
  bookingNo: string;
  statusKey: string;
  startDate: string;
  endDate: string;
  totalMinor: number;
  currency: string;
};

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [c, b] = await Promise.all([
        clientApi<Customer>(`/customers/${params.id}`),
        clientApi<BookingRow[]>(`/bookings?customerId=${encodeURIComponent(params.id)}`).catch(
          () => [] as BookingRow[],
        ),
      ]);
      setCustomer(c);
      setBookings(b);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load customer");
    }
  }

  useEffect(() => {
    void load();
  }, [params.id]);

  async function exportGdpr() {
    setBusy(true);
    try {
      const data = await clientApi(`/gdpr/customers/${params.id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customer-${params.id}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    setBusy(true);
    try {
      await clientApi(`/customers/${params.id}/deactivate`, { method: "PATCH" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deactivate failed");
    } finally {
      setBusy(false);
    }
  }

  if (!customer && !error) {
    return <main className="p-6 text-sm text-slate-500">Loading customer…</main>;
  }

  if (!customer) {
    return <main className="p-6 text-sm text-red-600">{error}</main>;
  }

  return (
    <main>
      <PageHeader
        title={`${customer.firstName} ${customer.lastName}`}
        description={customer.email}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" disabled={busy} onClick={exportGdpr}>
              GDPR export
            </Button>
            {customer.isActive ? (
              <Button variant="secondary" disabled={busy} onClick={deactivate}>
                Deactivate
              </Button>
            ) : null}
            <Link href="/admin/customers">
              <Button variant="secondary">Back</Button>
            </Link>
          </div>
        }
      />
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Badge tone={!customer.isActive ? "neutral" : customer.isGuest ? "warning" : "success"}>
              {!customer.isActive ? "Inactive" : customer.isGuest ? "Guest" : "Active"}
            </Badge>
          </div>
          <p>
            <span className="text-slate-500">Phone:</span> {customer.phone || "—"}
          </p>
          <p>
            <span className="text-slate-500">Address:</span>{" "}
            {[customer.address, customer.zipCode, customer.city, customer.country]
              .filter(Boolean)
              .join(", ") || "—"}
          </p>
          <p>
            <span className="text-slate-500">Joined:</span>{" "}
            {new Date(customer.createdAt).toLocaleString()}
          </p>
        </Card>
        <Card className="overflow-x-auto p-0">
          <div className="border-b border-slate-200 px-4 py-3 font-medium">Bookings</div>
          {bookings.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No bookings for this customer.</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Booking</th>
                  <th className="px-4 py-2 font-medium">Dates</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      <Link href={`/admin/bookings/${b.id}`} className="hover:text-teal-800">
                        {b.bookingNo}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      {String(b.startDate).slice(0, 10)} → {String(b.endDate).slice(0, 10)}
                    </td>
                    <td className="px-4 py-2">{b.statusKey}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </main>
  );
}
