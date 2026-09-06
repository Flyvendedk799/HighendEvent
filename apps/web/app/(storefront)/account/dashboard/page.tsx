import Link from "next/link";
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

export default async function CustomerDashboardPage() {
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

  const upcoming = bookings.filter((b) => !["cancelled", "completed", "returned"].includes(b.statusKey));
  const completed = bookings.filter((b) => ["completed", "returned"].includes(b.statusKey));
  const openBalance = bookings
    .filter((b) => ["partially_paid", "awaiting_payment", "confirmed"].includes(b.statusKey))
    .reduce((sum, b) => sum + b.totalMinor, 0);
  const currency = bookings[0]?.currency ?? "DKK";

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
          <p className="mt-2 font-display text-3xl font-semibold">{upcoming.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="mt-2 font-display text-3xl font-semibold">{completed.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Open balance</p>
          <p className="mt-2 font-display text-3xl font-semibold">
            {formatMoney(openBalance, currency)}
          </p>
        </Card>
      </div>
      <Card className="mt-6 space-y-3">
        <h2 className="font-display text-lg font-semibold">Recent bookings</h2>
        {bookings.slice(0, 5).length === 0 ? (
          <p className="text-sm text-muted-foreground">No bookings yet.</p>
        ) : (
          bookings.slice(0, 5).map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {b.bookingNo} · {String(b.startDate).slice(0, 10)}
              </span>
              <Badge tone="accent">{b.statusKey}</Badge>
            </div>
          ))
        )}
      </Card>
    </main>
  );
}
