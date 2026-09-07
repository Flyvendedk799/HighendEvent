import { Button, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

const assets = [
  "champagne-tower.jpg",
  "lounge-set.jpg",
  "fairy-lights.jpg",
  "warehouse-hero.jpg",
  "logo.svg",
  "invoice-header.png",
];

export default function AdminMediaPage() {
  return (
    <main>
      <PageHeader
        title="Media library"
        description="Product photos, logos, and CMS assets (R2-backed)."
        action={<Button>Upload</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset, i) => (
          <Card key={asset} className="overflow-hidden p-0">
            <div
              className={`aspect-video ${
                i % 3 === 0 ? "bg-teal-600" : i % 3 === 1 ? "bg-amber-500" : "bg-slate-600"
              }`}
            />
            <div className="p-3 text-sm font-medium">{asset}</div>
          </Card>
        ))}
      </div>
    </main>
  );
}
