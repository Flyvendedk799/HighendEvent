import { Page, PageHeader } from "@rentora/ui";
import { ThemeEditor } from "@/components/admin/theme-editor";
import { getStoreSettings } from "@/lib/actions/store";

export const metadata = { title: "Theme" };
export const dynamic = "force-dynamic";

export default async function AdminThemePage() {
  const store = await getStoreSettings();

  return (
    <Page>
      <PageHeader
        title="Theme"
        description="Your storefront colours, logo, and shape. Changes go live the moment you save — no redeploy."
      />
      <ThemeEditor store={store} />
    </Page>
  );
}
