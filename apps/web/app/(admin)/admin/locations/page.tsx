import { Badge, Button, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

const locations = [
  { name: "Copenhagen Warehouse", address: "Industrivej 12, 2100", primary: true },
  { name: "Aarhus Hub", address: "Havnevej 4, 8000", primary: false },
  { name: "Pickup locker · Nørreport", address: "Nørre Voldgade", primary: false },
];

export default function AdminLocationsPage() {
  return (
    <main>
      <PageHeader
        title="Locations"
        description="Warehouses, pickup points, and return desks."
        action={<Button>Add location</Button>}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {locations.map((l) => (
          <Card key={l.name}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">{l.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{l.address}</p>
              </div>
              {l.primary ? <Badge tone="success">Primary</Badge> : <Badge>Secondary</Badge>}
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
