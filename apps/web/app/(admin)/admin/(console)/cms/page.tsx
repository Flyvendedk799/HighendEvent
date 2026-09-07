import { Page, PageHeader } from "@rentora/ui";
import { CmsEditor } from "@/components/admin/cms-editor";
import { getCmsPages } from "@/lib/actions/cms";

export const metadata = { title: "Pages" };
export const dynamic = "force-dynamic";

export default async function AdminCmsPage() {
  const pages = await getCmsPages();

  return (
    <Page>
      <PageHeader
        title="Pages"
        description="About, FAQ, terms — anything customers ask before they book."
      />
      <CmsEditor pages={pages} />
    </Page>
  );
}
