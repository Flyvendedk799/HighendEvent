import Link from "next/link";
import { Badge, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";

type ChecklistItem = {
  key: string;
  item: string;
  done: boolean;
  optional?: boolean;
  href?: string;
};

type Checklist = {
  items: ChecklistItem[];
  done: number;
  total: number;
  ready: boolean;
};

export default async function AdminGoLivePage() {
  let checklist: Checklist = { items: [], done: 0, total: 0, ready: false };
  try {
    checklist = await api.get<Checklist>("/onboarding/go-live", { cache: "no-store" });
  } catch {
    checklist = { items: [], done: 0, total: 0, ready: false };
  }

  return (
    <main>
      <PageHeader
        title="Go-live checklist"
        description={
          checklist.total
            ? `${checklist.done}/${checklist.total} required complete${
                checklist.ready ? " — ready for live payments." : " — finish these before taking real payments."
              }`
            : "Could not load checklist. Sign in as staff and ensure the API is reachable."
        }
      />
      <Card className="space-y-3">
        {checklist.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No checklist items returned.</p>
        ) : (
          checklist.items.map((c) => (
            <div
              key={c.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3"
            >
              <div>
                <span className={c.done ? "text-muted-foreground line-through" : "font-medium"}>
                  {c.item}
                </span>
                {c.href ? (
                  <Link href={c.href} className="ml-3 text-sm text-primary hover:underline">
                    Open
                  </Link>
                ) : null}
              </div>
              <Badge tone={c.done ? "success" : c.optional ? "neutral" : "warning"}>
                {c.done ? "Done" : c.optional ? "Optional" : "Todo"}
              </Badge>
            </div>
          ))
        )}
      </Card>
    </main>
  );
}
