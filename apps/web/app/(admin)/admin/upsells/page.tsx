import { Badge, Button, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

const upsells = [
  { name: "Linen package", price: "185 DKK", attached: 12 },
  { name: "Extra syrup kit", price: "95 DKK", attached: 4 },
  { name: "Extension cord set", price: "45 DKK", attached: 21 },
  { name: "Setup assistant (2h)", price: "650 DKK", attached: 3 },
];

export default function AdminUpsellsPage() {
  return (
    <main>
      <PageHeader
        title="Upsells"
        description="Attach add-ons that appear on product and checkout flows."
        action={<Button>Add upsell</Button>}
      />
      <div className="space-y-3">
        {upsells.map((u) => (
          <Card key={u.name} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-medium">{u.name}</h2>
              <p className="text-sm text-muted-foreground">Attached to {u.attached} products</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone="accent">{u.price}</Badge>
              <Button variant="secondary" size="sm">
                Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
