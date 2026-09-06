import { Badge, Card, CardHeader } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";

type Plan = {
  tier: string;
  name: string;
  priceMinor: number;
  currency: string;
};

type Metrics = {
  planCounts?: Partial<Record<string, number>>;
  mrrMinor?: number;
};

export default async function PlatformPlansPage() {
  let plans: Plan[] = [];
  let metrics: Metrics | null = null;
  try {
    [plans, metrics] = await Promise.all([
      api.get<Plan[]>("/billing/plans", { cache: "no-store" }),
      api.get<Metrics>("/platform/metrics", { cache: "no-store" }),
    ]);
  } catch {
    plans = [];
    metrics = null;
  }

  return (
    <main>
      <PageHeader
        title="Plans & billing"
        description="Platform subscription tiers and estimated MRR from live tenant counts."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const count = metrics?.planCounts?.[p.tier] ?? 0;
          const mrr = count * p.priceMinor;
          return (
            <Card key={p.tier}>
              <div className="flex items-start justify-between">
                <h2 className="font-display text-xl font-semibold">{p.name}</h2>
                <Badge tone="accent">
                  {formatMoney(p.priceMinor, p.currency || "EUR", "en-IE")}/mo
                </Badge>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{count} tenants</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {formatMoney(mrr, p.currency || "EUR", "en-IE")} MRR
              </p>
            </Card>
          );
        })}
      </div>
      <Card className="mt-6">
        <CardHeader
          title="Platform MRR"
          description="Sum of plan list prices × tenant counts (stub until Stripe Billing invoices sync)."
        />
        <p className="font-display text-3xl font-semibold">
          {formatMoney(metrics?.mrrMinor ?? 0, "EUR", "en-IE")}
        </p>
      </Card>
    </main>
  );
}
