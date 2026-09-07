import { Badge, Button, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

const templates = [
  { name: "Booking confirmation", key: "booking_confirmation", status: "Active" },
  { name: "Deposit paid", key: "deposit_paid", status: "Active" },
  { name: "Out for delivery", key: "out_for_delivery", status: "Active" },
  { name: "Return reminder", key: "return_reminder", status: "Draft" },
  { name: "Newsletter welcome", key: "newsletter_welcome", status: "Active" },
];

export default function AdminEmailsPage() {
  return (
    <main>
      <PageHeader
        title="Email templates"
        description="Transactional messages sent via Resend."
        action={<Button variant="secondary">Preview sender</Button>}
      />
      <div className="space-y-3">
        {templates.map((t) => (
          <Card key={t.key} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-medium">{t.name}</h2>
              <p className="text-sm text-muted-foreground">{t.key}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={t.status === "Active" ? "success" : "warning"}>{t.status}</Badge>
              <Button size="sm" variant="secondary">
                Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
