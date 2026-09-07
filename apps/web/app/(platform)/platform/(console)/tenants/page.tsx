import Link from "next/link";
import {
  Badge,
  Button,
  EmptyState,
  FilterBar,
  Money,
  Page,
  PageHeader,
  SearchInput,
  Select,
  Table,
  TableContainer,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@rentora/ui";
import { TenantRowActions } from "@/components/platform/tenant-row-actions";
import { getPlatformTenants } from "@/lib/actions/platform";

export const metadata = { title: "Tenants" };
export const dynamic = "force-dynamic";

export default async function PlatformTenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; suspended?: string }>;
}) {
  const params = await searchParams;
  const tenants = await getPlatformTenants(params);
  const isFiltered = Boolean(params.q || params.plan || params.suspended);

  return (
    <Page>
      <PageHeader
        title="Tenants"
        description={`${tenants.length} store${tenants.length === 1 ? "" : "s"} on this deployment.`}
      />

      <FilterBar>
        <SearchInput defaultValue={params.q} placeholder="Name or slug" />
        <Select
          name="plan"
          aria-label="Plan"
          defaultValue={params.plan ?? ""}
          className="w-36"
          options={[
            { value: "", label: "Any plan" },
            { value: "STARTER", label: "Starter" },
            { value: "GROWTH", label: "Growth" },
            { value: "SCALE", label: "Scale" },
          ]}
        />
        <Select
          name="suspended"
          aria-label="Status"
          defaultValue={params.suspended ?? ""}
          className="w-40"
          options={[
            { value: "", label: "Any status" },
            { value: "false", label: "Active" },
            { value: "true", label: "Suspended" },
          ]}
        />
        <Button type="submit" variant="secondary">
          Apply
        </Button>
        {isFiltered ? (
          <Button variant="ghost" asChild>
            <Link href="/platform/tenants">Clear</Link>
          </Button>
        ) : null}
      </FilterBar>

      <TableContainer>
        <Table>
          <THead>
            <Tr>
              <Th>Store</Th>
              <Th>Plan</Th>
              <Th>Payouts</Th>
              <Th align="right">Products</Th>
              <Th align="right">Bookings</Th>
              <Th align="right">GMV</Th>
              <Th>Status</Th>
              <Th align="right" />
            </Tr>
          </THead>
          <TBody>
            {tenants.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12">
                  <EmptyState
                    title={isFiltered ? "No tenants match those filters" : "No tenants yet"}
                    description={
                      isFiltered
                        ? "Try clearing the filters."
                        : "Stores appear here as soon as somebody signs up."
                    }
                    action={
                      isFiltered ? (
                        <Button variant="secondary" asChild>
                          <Link href="/platform/tenants">Clear filters</Link>
                        </Button>
                      ) : undefined
                    }
                  />
                </td>
              </tr>
            ) : (
              tenants.map((tenant) => (
                <Tr key={tenant.id}>
                  <Td>
                    <Link
                      href={`/platform/tenants/${tenant.slug}`}
                      className="font-medium hover:underline"
                    >
                      {tenant.name}
                    </Link>
                    <span className="block text-xs text-[var(--color-muted-foreground)]">
                      {tenant.primaryDomain ?? `${tenant.slug}.rentora.app`}
                    </span>
                  </Td>
                  <Td muted>{tenant.plan}</Td>
                  <Td>
                    <Badge tone={tenant.connectOnboarded ? "success" : "warning"}>
                      {tenant.connectOnboarded ? "Connected" : "Pending"}
                    </Badge>
                  </Td>
                  <Td numeric>{tenant.counts.products}</Td>
                  <Td numeric>{tenant.counts.bookings}</Td>
                  <Td numeric>
                    <Money amountMinor={tenant.gmvMinor} currency={tenant.currency} />
                  </Td>
                  <Td>
                    <Badge tone={tenant.isSuspended ? "danger" : "success"}>
                      {tenant.isSuspended ? "Suspended" : "Active"}
                    </Badge>
                  </Td>
                  <Td align="right">
                    <TenantRowActions tenant={tenant} />
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
