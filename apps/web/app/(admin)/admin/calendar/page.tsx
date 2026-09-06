import { Badge, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

const days = Array.from({ length: 28 }, (_, i) => i + 1);
const busy = new Set([6, 7, 12, 13, 14, 18, 19, 25]);

export default function AdminCalendarPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  return (
    <main>
      <PageHeader
        title="Calendar"
        description="Fleet-wide availability and booking density. Subscribe via ICS for Outlook/Google."
      />
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">September 2026</h2>
          <div className="flex items-center gap-2">
            <a
              href={`${apiBase}/bookings/calendar.ics`}
              className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-900 hover:bg-teal-100"
            >
              Download ICS feed
            </a>
            <Badge tone="accent">Demo month</Badge>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="py-1 font-medium">
              {d}
            </div>
          ))}
          {days.map((day) => (
            <div
              key={day}
              className={`min-h-16 rounded-lg border p-2 text-left text-sm ${
                busy.has(day)
                  ? "border-teal-200 bg-teal-50 text-teal-900"
                  : "border-border bg-surface text-foreground"
              }`}
            >
              <div className="font-medium">{day}</div>
              {busy.has(day) ? <div className="mt-2 text-[10px]">3 bookings</div> : null}
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}
