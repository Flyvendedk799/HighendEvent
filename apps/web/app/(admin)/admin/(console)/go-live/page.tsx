import { Badge, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

const checklist = [
  { item: "Connect Stripe account", done: true },
  { item: "Add at least 5 products with images", done: true },
  { item: "Configure delivery zones", done: true },
  { item: "Set tax & deposit model", done: false },
  { item: "Verify custom domain DNS", done: false },
  { item: "Send test booking confirmation email", done: false },
  { item: "Invite a staff member", done: true },
  { item: "Publish theme & logo", done: true },
];

export default function AdminGoLivePage() {
  const done = checklist.filter((c) => c.done).length;
  return (
    <main>
      <PageHeader
        title="Go-live checklist"
        description={`${done}/${checklist.length} complete — finish these before taking real payments.`}
      />
      <Card className="space-y-3">
        {checklist.map((c) => (
          <div
            key={c.item}
            className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3"
          >
            <span className={c.done ? "text-muted-foreground line-through" : "font-medium"}>
              {c.item}
            </span>
            <Badge tone={c.done ? "success" : "warning"}>{c.done ? "Done" : "Todo"}</Badge>
          </div>
        ))}
      </Card>
    </main>
  );
}
