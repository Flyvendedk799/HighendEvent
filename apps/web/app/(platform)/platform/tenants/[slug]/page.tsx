import Link from "next/link";
import { Badge, Button, Card, CardHeader } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

export default async function PlatformTenantDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const name = slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

  return (
    <main>
      <PageHeader
        title={name}
        description={`Tenant slug · ${slug}`}
        action={
          <Link href="/platform/tenants">
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-3 lg:col-span-2">
          <CardHeader title="Subscription" action={<Badge tone="accent">GROWTH</Badge>} />
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Stripe customer</dt>
              <dd className="font-medium">cus_demo_{slug}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Connect</dt>
              <dd className="font-medium">Onboarded</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Application fee</dt>
              <dd className="font-medium">2.5%</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="font-medium">2025-11-02</dd>
            </div>
          </dl>
        </Card>
        <Card className="space-y-3">
          <CardHeader title="Actions" />
          <Button className="w-full" variant="secondary">
            Impersonate admin
          </Button>
          <Button className="w-full" variant="secondary">
            Suspend tenant
          </Button>
          <Button className="w-full" variant="danger">
            Delete (soft)
          </Button>
        </Card>
      </div>
    </main>
  );
}
