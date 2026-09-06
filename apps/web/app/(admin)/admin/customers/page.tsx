import { Badge, Button, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

const customers = [
  { name: "Maja Nielsen", email: "maja@example.com", bookings: 4, tier: "Returning" },
  { name: "Event House ApS", email: "hello@eventhouse.dk", bookings: 18, tier: "VIP" },
  { name: "Jonas Holm", email: "jonas@holm.dk", bookings: 1, tier: "New" },
  { name: "Studio North", email: "book@studionorth.dk", bookings: 9, tier: "Returning" },
];

export default function AdminCustomersPage() {
  return (
    <main>
      <PageHeader
        title="Customers"
        description="CRM-lite view of renters and company accounts."
        action={<Button variant="secondary">Export CSV</Button>}
      />
      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/60 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Bookings</th>
              <th className="px-4 py-3 font-medium">Tier</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.email} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{c.email}</td>
                <td className="px-4 py-3">{c.bookings}</td>
                <td className="px-4 py-3">
                  <Badge tone={c.tier === "VIP" ? "accent" : "neutral"}>{c.tier}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
