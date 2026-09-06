import { Card, CardHeader } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

const bars = [42, 55, 38, 70, 64, 88, 76, 91, 67, 80, 95, 72];

export default function AdminAnalyticsPage() {
  return (
    <main>
      <PageHeader
        title="Analytics"
        description="Revenue trend, conversion, and category mix (demo data)."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue · last 12 weeks" description="Indexed demo series" />
          <div className="flex h-48 items-end gap-2">
            {bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-to-t from-teal-800 to-teal-400"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </Card>
        <Card className="space-y-4">
          <CardHeader title="Highlights" />
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Conversion</span>
              <span className="font-semibold">3.8%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg order</span>
              <span className="font-semibold">2.140 DKK</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Top category</span>
              <span className="font-semibold">Furniture</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Repeat rate</span>
              <span className="font-semibold">29%</span>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
