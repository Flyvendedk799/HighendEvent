import {
  Badge,
  Button,
  EmptyState,
  Page,
  PageHeader,
  StatCard,
  Table,
  TableContainer,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@rentora/ui";
import { NewsletterExport } from "@/components/admin/newsletter-export";
import { getNewsletterSubscribers } from "@/lib/actions/operations";

export const metadata = { title: "Newsletter" };
export const dynamic = "force-dynamic";

export default async function AdminNewsletterPage() {
  const subscribers = await getNewsletterSubscribers();
  const active = subscribers.filter((s) => s.isActive);

  const thisMonth = subscribers.filter((s) => {
    const created = new Date(s.createdAt);
    const now = new Date();
    return (
      created.getUTCFullYear() === now.getUTCFullYear() &&
      created.getUTCMonth() === now.getUTCMonth()
    );
  });

  return (
    <Page className="max-w-4xl">
      <PageHeader
        title="Newsletter"
        description="People who asked to hear from you. Export the list to send a campaign from your email tool."
        action={<NewsletterExport subscribers={active} />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Subscribed" value={active.length} />
        <StatCard label="Joined this month" value={thisMonth.length} />
        <StatCard
          label="Unsubscribed"
          value={subscribers.length - active.length}
          hint="Kept so they are not re-added by mistake"
        />
      </div>

      <TableContainer>
        <Table>
          <THead>
            <Tr>
              <Th>Email</Th>
              <Th>Joined</Th>
              <Th>Status</Th>
            </Tr>
          </THead>
          <TBody>
            {subscribers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-12">
                  <EmptyState
                    title="Nobody has subscribed yet"
                    description="Add a signup form to your storefront footer and subscribers will appear here."
                  />
                </td>
              </tr>
            ) : (
              subscribers.map((subscriber) => (
                <Tr key={subscriber.id}>
                  <Td>{subscriber.email}</Td>
                  <Td muted>{new Date(subscriber.createdAt).toLocaleDateString()}</Td>
                  <Td>
                    <Badge tone={subscriber.isActive ? "success" : "neutral"}>
                      {subscriber.isActive ? "Subscribed" : "Unsubscribed"}
                    </Badge>
                  </Td>
                </Tr>
              ))
            )}
          </TBody>
        </Table>
      </TableContainer>
    </Page>
  );
}
