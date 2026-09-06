import Link from "next/link";
import { Badge, Card, CardHeader } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";

type PlatformMetrics = {
  tenants: number;
  activeTenants: number;
  suspended: number;
  bookings: number;
  gmvMinor: number;
  mrrMinor: number;
  attention: Array<{ slug: string; name: string; reason: string; tone: string }>;
};

export default async function PlatformHomePage() {
  let metrics: PlatformMetrics | null = null;
  try {
    metrics = await api.get<PlatformMetrics>("/platform/metrics", { cache: "no-store" });
  } catch {
    metrics = null;
  }

  const cards = [
    ["Active tenants", metrics ? String(metrics.activeTenants) : "—"],
    ["MRR", metrics ? formatMoney(metrics.mrrMinor, "EUR", "en-IE") : "—"],
    ["Bookings", metrics ? String(metrics.bookings) : "—"],
    ["Suspended", metrics ? String(metrics.suspended) : "—"],
  ] as const;

  return (
    <main>
      <PageHeader
        title="Platform overview"
        description="Operate every Rentora tenant from the control plane."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Needs attention"
            action={
              <Link href="/platform/tenants" className="text-sm text-primary hover:underline">
                View tenants
              </Link>
            }
          />
          <ul className="space-y-3 text-sm">
            {(metrics?.attention ?? []).length === 0 ? (
              <li className="text-muted-foreground">All tenants look healthy.</li>
            ) : (
              metrics!.attention.map((item) => (
                <li key={item.slug} className="flex justify-between gap-3">
                  <Link href={`/platform/tenants/${item.slug}`} className="hover:underline">
                    {item.name} · {item.reason}
                  </Link>
                  <Badge
                    tone={
                      item.tone === "danger"
                        ? "danger"
                        : item.tone === "warning"
                          ? "warning"
                          : "accent"
                    }
                  >
                    Action
                  </Badge>
                </li>
              ))
            )}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Quick links" />
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/platform/tenants" className="rounded-lg bg-muted px-3 py-2 hover:bg-teal-50">
              Manage tenants
            </Link>
            <Link href="/platform/plans" className="rounded-lg bg-muted px-3 py-2 hover:bg-teal-50">
              Plans & billing
            </Link>
            <Link
              href="/platform/feature-flags"
              className="rounded-lg bg-muted px-3 py-2 hover:bg-teal-50"
            >
              Feature flags
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
