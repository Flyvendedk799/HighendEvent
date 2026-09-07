import { Page, PageHeader } from "@rentora/ui";
import { EmailTemplates } from "@/components/admin/email-templates";
import { getEmailTemplates } from "@/lib/actions/emails";

export const metadata = { title: "Emails" };
export const dynamic = "force-dynamic";

export default async function AdminEmailsPage() {
  const { templates, catalog, variables } = await getEmailTemplates();

  // The worker owns delivery; the API only knows whether a key is present in its own env.
  const providerConfigured = Boolean(
    process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith("re_xxx"),
  );

  return (
    <Page>
      <PageHeader
        title="Emails"
        description="What Rentora sends your customers, in your words and your branding."
      />
      <EmailTemplates
        templates={templates}
        catalog={catalog}
        variables={variables}
        providerConfigured={providerConfigured}
      />
    </Page>
  );
}
