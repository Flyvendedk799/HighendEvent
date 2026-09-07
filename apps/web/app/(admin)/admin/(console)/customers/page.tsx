import Link from "next/link";
import {
  Badge,
  Button,
  EmptyState,
  FilterBar,
  Page,
  PageHeader,
  SearchInput,
  Table,
  TableContainer,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@rentora/ui";
import { serverGet } from "@/lib/server-api";
import type { Customer } from "@/lib/types";

export const metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

type CustomerRow = Customer & { _count?: { bookings: number } };

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const customers = await serverGet<CustomerRow[]>(
    `/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    { cache: "no-store" },
  );

  return (
    <Page>
      <PageHeader
        title="Customers"
        description="Everyone who has booked with you, including guest checkouts."
      />

      <FilterBar>
        <SearchInput defaultValue={q} placeholder="Name, email, phone, city" />
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {q ? (
          <Button variant="ghost" asChild>
            <Link href="/admin/customers">Clear</Link>
          </Button>
        ) : null}
      </FilterBar>

      <TableContainer>
        <Table>
          <THead>
            <Tr>
              <Th>Customer</Th>
              <Th>Contact</Th>
              <Th>Location</Th>
              <Th align="right">Bookings</Th>
              <Th>Account</Th>
            </Tr>
          </THead>
          <TBody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12">
                  <EmptyState
                    title={q ? "No customers match that search" : "No customers yet"}
                    description={
                      q
                        ? "Try a different name, email, or phone number."
                        : "Customers appear here as soon as someone books, whether or not they created an account."
                    }
                    action={
                      q ? (
                        <Button variant="secondary" asChild>
                          <Link href="/admin/customers">Clear search</Link>
                        </Button>
                      ) : undefined
                    }
                  />
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <Tr key={customer.id} interactive>
                  <Td>
                    <Link
                      href={`/admin/customers/${customer.id}`}
                      className="font-medium hover:underline"
                    >
                      {customer.firstName} {customer.lastName}
                    </Link>
                  </Td>
                  <Td muted>
                    <span className="block truncate">{customer.email}</span>
                    {customer.phone ? (
                      <span className="block truncate text-xs">{customer.phone}</span>
                    ) : null}
                  </Td>
                  <Td muted>
                    {customer.city ? `${customer.zipCode ?? ""} ${customer.city}`.trim() : "—"}
                  </Td>
                  <Td numeric>{customer._count?.bookings ?? 0}</Td>
                  <Td>
                    <Badge tone={customer.isGuest ? "neutral" : "success"}>
                      {customer.isGuest ? "Guest" : "Registered"}
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
