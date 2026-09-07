import { Button, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

export default function AdminNewsletterPage() {
  return (
    <main>
      <PageHeader
        title="Newsletter"
        description="Subscriber list and campaign stubs."
        action={<Button>Compose</Button>}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-muted-foreground">Subscribers</p>
          <p className="mt-2 font-display text-3xl font-semibold">1.284</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Open rate</p>
          <p className="mt-2 font-display text-3xl font-semibold">41%</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Last send</p>
          <p className="mt-2 font-display text-3xl font-semibold">Aug 28</p>
        </Card>
      </div>
      <Card className="mt-6">
        <h2 className="font-display text-lg font-semibold">Recent campaigns</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {[
            "Late summer outdoor lighting",
            "Wedding season early-bird",
            "Warehouse open day",
          ].map((c) => (
            <li key={c} className="flex justify-between rounded-lg bg-muted px-3 py-2">
              <span>{c}</span>
              <span className="text-muted-foreground">Sent</span>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
