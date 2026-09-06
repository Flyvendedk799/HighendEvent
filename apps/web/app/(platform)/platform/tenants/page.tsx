import Link from "next/link";
import { Badge, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

const tenants = [
  { slug: "highend-event", name: "Highend Event", plan: "GROWTH", status: "Active" },
  { slug: "lumen-av", name: "Lumen AV Hire", plan: "SCALE", status: "Past due" },
  { slug: "garden-hire", name: "Garden Event Rentals", plan: "STARTER", status: "Trial" },
  { slug: "nordic-party", name: "Nordic Party Co.", plan: "GROWTH", status: "Active" },
];

export default function PlatformTenantsPage() {
  return (
    <main>
      <PageHeader title="Tenants" description="All rental brands on the Rentora platform." />
      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/60 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.slug} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/platform/tenants/${t.slug}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {t.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{t.slug}</td>
                <td className="px-4 py-3">
                  <Badge tone="accent">{t.plan}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    tone={
                      t.status === "Active" ? "success" : t.status === "Past due" ? "danger" : "warning"
                    }
                  >
                    {t.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
