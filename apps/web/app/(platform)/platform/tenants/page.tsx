import Link from "next/link";
import { Badge, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";

type TenantRow = {
  id: string;
  slug: string;
  name: string;
  plan: string;
  isSuspended: boolean;
  connectOnboarded: boolean;
  _count?: { products: number; bookings: number };
};

export default async function PlatformTenantsPage() {
  let tenants: TenantRow[] = [];
  try {
    tenants = await api.get<TenantRow[]>("/platform/tenants", { cache: "no-store" });
  } catch {
    tenants = [];
  }

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
              <th className="px-4 py-3 font-medium">Catalog</th>
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                  No tenants yet. Use marketing signup to create one.
                </td>
              </tr>
            ) : (
              tenants.map((t) => {
                const status = t.isSuspended
                  ? "Suspended"
                  : t.connectOnboarded
                    ? "Active"
                    : "Setup";
                return (
                  <tr key={t.id} className="border-b border-border last:border-0">
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
                          status === "Active"
                            ? "success"
                            : status === "Suspended"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t._count?.products ?? 0} products · {t._count?.bookings ?? 0} bookings
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
