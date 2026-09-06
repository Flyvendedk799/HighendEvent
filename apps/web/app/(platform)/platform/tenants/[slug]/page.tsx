import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Card, CardHeader } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { TenantActions } from "./tenant-actions";

type TenantDetail = {
  id: string;
  slug: string;
  name: string;
  plan: string;
  isSuspended: boolean;
  connectOnboarded: boolean;
  stripeCustomerId: string | null;
  stripeConnectAccountId: string | null;
  applicationFeeBps: number;
  featureFlags: Record<string, unknown>;
  createdAt: string;
  limits: {
    maxProducts: number | null;
    maxStaff: number | null;
    customDomains: boolean;
  };
  _count: { products: number; bookings: number; customers: number; staff: number };
  domains: Array<{ id: string; hostname: string; verified: boolean; sslStatus: string }>;
  stores: Array<{ name: string; currency: string }>;
};

export default async function PlatformTenantDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let tenant: TenantDetail | null = null;
  try {
    tenant = await api.get<TenantDetail>(`/platform/tenants/${slug}`, { cache: "no-store" });
  } catch {
    tenant = null;
  }
  if (!tenant) notFound();

  return (
    <main>
      <PageHeader
        title={tenant.name}
        description={`Tenant slug · ${tenant.slug}`}
        action={
          <Link href="/platform/tenants">
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-3 lg:col-span-2">
          <CardHeader title="Subscription" action={<Badge tone="accent">{tenant.plan}</Badge>} />
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Stripe customer</dt>
              <dd className="font-medium">{tenant.stripeCustomerId ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Connect</dt>
              <dd className="font-medium">
                {tenant.connectOnboarded ? "Onboarded" : "Incomplete"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Application fee</dt>
              <dd className="font-medium">{(tenant.applicationFeeBps / 100).toFixed(2)}%</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="font-medium">{new Date(tenant.createdAt).toISOString().slice(0, 10)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Products / staff</dt>
              <dd className="font-medium">
                {tenant._count.products}
                {tenant.limits.maxProducts != null ? ` / ${tenant.limits.maxProducts}` : ""} ·{" "}
                {tenant._count.staff}
                {tenant.limits.maxStaff != null ? ` / ${tenant.limits.maxStaff}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <Badge tone={tenant.isSuspended ? "danger" : "success"}>
                  {tenant.isSuspended ? "Suspended" : "Active"}
                </Badge>
              </dd>
            </div>
          </dl>
          {tenant.domains.length > 0 ? (
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-sm font-medium">Custom domains</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {tenant.domains.map((d) => (
                  <li key={d.id}>
                    {d.hostname} · {d.verified ? "verified" : "pending"} · SSL {d.sslStatus}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
        <TenantActions
          tenantId={tenant.id}
          slug={tenant.slug}
          plan={tenant.plan}
          isSuspended={tenant.isSuspended}
          featureFlags={tenant.featureFlags ?? {}}
        />
      </div>
    </main>
  );
}
