import { Button, Card, Badge } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

const categories = [
  { name: "Furniture", products: 18, visible: true },
  { name: "Lighting", products: 9, visible: true },
  { name: "Glassware", products: 14, visible: true },
  { name: "Machines", products: 7, visible: false },
  { name: "Entertainment", products: 5, visible: true },
];

export default function AdminCategoriesPage() {
  return (
    <main>
      <PageHeader
        title="Categories"
        description="Organize the catalog and control storefront navigation."
        action={<Button>New category</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Card key={c.name}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">{c.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{c.products} products</p>
              </div>
              <Badge tone={c.visible ? "success" : "neutral"}>
                {c.visible ? "Visible" : "Hidden"}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
