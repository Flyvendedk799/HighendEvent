import { Page, PageHeader } from "@rentora/ui";
import { CategoryManager, type CategoryRow } from "@/components/admin/category-manager";
import { serverGet } from "@/lib/server-api";

export const metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await serverGet<CategoryRow[]>(
    "/catalog/categories?includeInactive=true",
    { cache: "no-store" },
  );

  return (
    <Page className="max-w-4xl">
      <PageHeader
        title="Categories"
        description="How shoppers browse your catalog. Order them the way you want them to appear."
      />
      <CategoryManager categories={categories} />
    </Page>
  );
}
