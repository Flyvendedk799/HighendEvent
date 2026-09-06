import { Badge, Card, CardHeader } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

const plans = [
  { name: "Starter", price: "€49", tenants: 18, mrr: "€882" },
  { name: "Growth", price: "€129", tenants: 17, mrr: "€2.193" },
  { name: "Scale", price: "€299", tenants: 7, mrr: "€2.093" },
];

export default function PlatformPlansPage() {
  return (
    <main>
      <PageHeader
        title="Plans & billing"
        description="Platform subscription overview (Stripe Billing stub)."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.name}>
            <div className="flex items-start justify-between">
              <h2 className="font-display text-xl font-semibold">{p.name}</h2>
              <Badge tone="accent">{p.price}/mo</Badge>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{p.tenants} tenants</p>
            <p className="mt-1 font-display text-2xl font-semibold">{p.mrr} MRR</p>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <CardHeader title="Recent invoices" description="Demo ledger" />
        <ul className="space-y-3 text-sm">
          {[
            ["INV-2041", "Nordic Party Co.", "€129", "Paid"],
            ["INV-2038", "Lumen AV Hire", "€299", "Open"],
            ["INV-2033", "Garden Event Rentals", "€49", "Paid"],
          ].map(([id, tenant, amount, status]) => (
            <li key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2">
              <span>
                {id} · {tenant}
              </span>
              <span className="flex items-center gap-2">
                {amount}
                <Badge tone={status === "Paid" ? "success" : "warning"}>{status}</Badge>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
