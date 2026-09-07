import Link from "next/link";
import { Badge, Card, CardHeader } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

export default function PlatformHomePage() {
  return (
    <main>
      <PageHeader
        title="Platform overview"
        description="Operate every Rentora tenant from the control plane."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Active tenants", "42"],
          ["MRR", "€18.4k"],
          ["Trials", "7"],
          ["Suspended", "1"],
        ].map(([label, value]) => (
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
            <li className="flex justify-between">
              <span>highend-event · Connect incomplete</span>
              <Badge tone="warning">Action</Badge>
            </li>
            <li className="flex justify-between">
              <span>lumen-av · Past due invoice</span>
              <Badge tone="danger">Billing</Badge>
            </li>
            <li className="flex justify-between">
              <span>garden-hire · Domain SSL pending</span>
              <Badge tone="accent">DNS</Badge>
            </li>
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
