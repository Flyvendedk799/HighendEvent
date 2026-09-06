import { Badge, Button, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

const pages = [
  { title: "About", slug: "about", status: "Published" },
  { title: "FAQ", slug: "faq", status: "Published" },
  { title: "Terms", slug: "terms", status: "Draft" },
  { title: "Contact", slug: "contact", status: "Published" },
];

export default function AdminCmsPage() {
  return (
    <main>
      <PageHeader
        title="CMS pages"
        description="Editable content blocks for the tenant storefront."
        action={<Button>New page</Button>}
      />
      <div className="space-y-3">
        {pages.map((p) => (
          <Card key={p.slug} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-medium">{p.title}</h2>
              <p className="text-sm text-muted-foreground">/{p.slug}</p>
            </div>
            <Badge tone={p.status === "Published" ? "success" : "warning"}>{p.status}</Badge>
          </Card>
        ))}
      </div>
    </main>
  );
}
