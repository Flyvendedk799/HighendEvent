import { Badge, Button, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

const staff = [
  { name: "Anna Owner", email: "anna@demo.rentora.app", role: "OWNER" },
  { name: "Lars Manager", email: "lars@demo.rentora.app", role: "MANAGER" },
  { name: "Sofie Staff", email: "sofie@demo.rentora.app", role: "STAFF" },
  { name: "Read Only", email: "audit@demo.rentora.app", role: "READONLY" },
];

export default function AdminStaffPage() {
  return (
    <main>
      <PageHeader
        title="Staff"
        description="Invite teammates and assign role-based access."
        action={<Button>Invite staff</Button>}
      />
      <div className="space-y-3">
        {staff.map((s) => (
          <Card key={s.email} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-medium">{s.name}</h2>
              <p className="text-sm text-muted-foreground">{s.email}</p>
            </div>
            <Badge tone={s.role === "OWNER" ? "accent" : "neutral"}>{s.role}</Badge>
          </Card>
        ))}
      </div>
    </main>
  );
}
