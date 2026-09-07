import Link from "next/link";
import { Button, Page, PageHeader } from "@rentora/ui";
import { ResourceCalendar } from "@/components/admin/resource-calendar";
import { serverGet } from "@/lib/server-api";
import type { AvailabilityOverview, StorefrontBootstrap } from "@/lib/types";

export const metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

/** The visible window: a whole month, defaulting to the one containing today. */
function monthWindow(monthParam?: string) {
  const base = monthParam ? new Date(`${monthParam}-01T00:00:00Z`) : new Date();
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();

  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0));

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    label: new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(start),
    prev: new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 7),
    next: new Date(Date.UTC(year, month + 1, 1)).toISOString().slice(0, 7),
  };
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const window = monthWindow(month);

  const [overview, bootstrap] = await Promise.all([
    serverGet<AvailabilityOverview>(
      `/availability/overview?startDate=${window.startDate}&endDate=${window.endDate}`,
      { cache: "no-store" },
    ),
    serverGet<StorefrontBootstrap>("/storefront/bootstrap").catch(() => null),
  ]);

  return (
    <Page>
      <PageHeader
        title="Calendar"
        description="Occupancy across your whole catalog, including prep and cleanup buffers."
        secondaryAction={
          <Button variant="secondary" asChild>
            <a href="/api/bookings.ics">Subscribe (ICS)</a>
          </Button>
        }
        action={
          <Button asChild>
            <Link href="/admin/bookings/new">New booking</Link>
          </Button>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/admin/calendar?month=${window.prev}`}>← Previous</Link>
        </Button>
        <p className="text-sm font-semibold">{window.label}</p>
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/admin/calendar?month=${window.next}`}>Next →</Link>
        </Button>
      </div>

      <ResourceCalendar
        overview={overview}
        locale={bootstrap?.store.localeDefault ?? "en"}
      />

      <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
        A number in a coloured bar is the quantity on that booking. A number on an amber cell is
        how many units remain free that day.
      </p>
    </Page>
  );
}
