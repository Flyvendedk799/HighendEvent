import { Badge, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

const days = Array.from({ length: 28 }, (_, i) => i + 1);
const busy = new Set([6, 7, 12, 13, 14, 18, 19, 25]);

export default function AdminCalendarPage() {
  return (
    <main>
      <PageHeader
        title="Calendar"
        description="Fleet-wide availability and booking density for September 2026."
      />
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">September 2026</h2>
          <Badge tone="accent">Demo month</Badge>
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
