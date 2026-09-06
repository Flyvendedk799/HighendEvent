import Link from "next/link";
import { Badge, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";

type TenantRow = {
  id: string;
  slug: string;
  name: string;
  featureFlags?: Record<string, unknown> | null;
};

export default async function PlatformFeatureFlagsPage() {
  let tenants: TenantRow[] = [];
  try {
    tenants = await api.get<TenantRow[]>("/platform/tenants", { cache: "no-store" });
  } catch {
    tenants = [];
  }

  return (
    <main>
      <PageHeader
        title="Feature flags"
        description="Flags are persisted per tenant. Open a tenant to toggle and save."
      />
      <div className="space-y-3">
        {tenants.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">No tenants found.</p>
          </Card>
        ) : (
          tenants.map((t) => {
            const flags = t.featureFlags ?? {};
            const entries = Object.entries(flags);
            return (
              <Card key={t.id} className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link
                    href={`/platform/tenants/${t.slug}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {t.name}
                  </Link>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{t.slug}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entries.length === 0 ? (
                      <span className="text-sm text-muted-foreground">No flags set</span>
                    ) : (
                      entries.map(([key, value]) => (
                        <Badge key={key} tone={value ? "success" : "neutral"}>
                          {key}: {String(value)}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                <Link href={`/platform/tenants/${t.slug}`} className="text-sm text-primary hover:underline">
                  Edit
                </Link>
              </Card>
            );
          })
        )}
      </div>
    </main>
  );
}
