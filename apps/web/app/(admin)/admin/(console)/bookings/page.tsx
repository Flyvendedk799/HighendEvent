import Link from "next/link";
import {
  Badge,
  Button,
  DateRange,
  EmptyState,
  FilterBar,
  Money,
  Page,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  StatusBadge,
  Table,
  TableContainer,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@rentora/ui";
import { serverGet } from "@/lib/server-api";
import type { Booking, Product } from "@/lib/types";

export const metadata = { title: "Bookings" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending payment" },
  { value: "deposit_paid", label: "Deposit paid" },
  { value: "fully_paid", label: "Fully paid" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "returned_good", label: "Returned" },
  { value: "returned_damaged", label: "Returned damaged" },
  { value: "deposit_refunded", label: "Deposit refunded" },
  { value: "cancelled", label: "Cancelled" },
];

type SearchParams = {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  product?: string;
  fulfilment?: string;
  deleted?: string;
  page?: string;
};

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const query = new URLSearchParams({
    take: String(PAGE_SIZE),
    skip: String((page - 1) * PAGE_SIZE),
  });
  if (params.q) query.set("q", params.q);
  if (params.status) query.set("statusKey", params.status);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.product) query.set("productId", params.product);
  if (params.fulfilment) query.set("deliveryType", params.fulfilment);
  if (params.deleted === "1") query.set("includeDeleted", "true");

  const [result, products] = await Promise.all([
    serverGet<{ items: Booking[]; total: number }>(`/bookings?${query}`, { cache: "no-store" }),
    serverGet<Product[]>("/catalog/products?includeInactive=true", { cache: "no-store" }).catch(
      () => [] as Product[],
    ),
  ]);

  const isFiltered = Boolean(
    params.q || params.status || params.from || params.to || params.product || params.fulfilment,
  );

  function hrefForPage(nextPage: number): string {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "page") next.set(key, value);
    }
    next.set("page", String(nextPage));
    return `/admin/bookings?${next}`;
  }

  return (
    <Page>
      <PageHeader
        title="Bookings"
        description="Everything taken online and everything your team booked by hand."
        secondaryAction={
          <Button variant="secondary" asChild>
            <a href="/api/bookings.ics">Subscribe (ICS)</a>
          </Button>
        }
        action={
          <Button asChild>
            <Link href="/admin/bookings/new">New booking</Link>
          </Button>
        }
      />

      <FilterBar>
        <SearchInput defaultValue={params.q} placeholder="Booking no, name, email, phone" />
        <Select
          name="status"
          aria-label="Status"
          defaultValue={params.status ?? ""}
          className="w-44"
          options={STATUS_OPTIONS}
        />
        <Select
          name="fulfilment"
          aria-label="Fulfilment"
          defaultValue={params.fulfilment ?? ""}
          className="w-36"
          options={[
            { value: "", label: "Any fulfilment" },
            { value: "PICKUP", label: "Collection" },
            { value: "DELIVERY", label: "Delivery" },
          ]}
        />
        <Select
          name="product"
          aria-label="Product"
          defaultValue={params.product ?? ""}
          className="w-44"
          options={[
            { value: "", label: "Any product" },
            ...products.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
        <label className="flex flex-col gap-1 text-[13px] font-medium">
          From
          <input
            type="date"
            name="from"
            defaultValue={params.from}
            className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-medium">
          To
          <input
            type="date"
            name="to"
            defaultValue={params.to}
            className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
          />
        </label>
        <Button type="submit" variant="secondary">
          Apply
        </Button>
        {isFiltered ? (
          <Button variant="ghost" asChild>
            <Link href="/admin/bookings">Clear</Link>
          </Button>
        ) : null}
      </FilterBar>

      <TableContainer>
        <Table>
          <THead>
            <Tr>
              <Th>Booking</Th>
              <Th>Customer</Th>
              <Th>Dates</Th>
              <Th>Fulfilment</Th>
              <Th>Status</Th>
              <Th align="right">Outstanding</Th>
              <Th align="right">Total</Th>
            </Tr>
          </THead>
          <TBody>
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12">
                  {isFiltered ? (
                    <EmptyState
                      title="No bookings match those filters"
                      description="Widen the date range, or clear the filters to see everything."
                      action={
                        <Button variant="secondary" asChild>
                          <Link href="/admin/bookings">Clear filters</Link>
                        </Button>
                      }
                    />
                  ) : (
                    <EmptyState
                      title="No bookings yet"
                      description="Storefront bookings land here automatically. You can also take one over the phone."
                      action={
                        <Button asChild>
                          <Link href="/admin/bookings/new">Create a booking</Link>
                        </Button>
                      }
                    />
                  )}
                </td>
              </tr>
            ) : (
              result.items.map((booking) => (
                <Tr key={booking.id} interactive>
                  <Td>
                    <Link
                      href={`/admin/bookings/${booking.id}`}
                      className="font-medium hover:underline"
                    >
                      {booking.bookingNo}
                    </Link>
                    <span className="block text-xs text-[var(--color-muted-foreground)]">
                      {booking.source === "MANUAL" ? "By staff" : "Online"}
                      {booking.isDeleted ? " · deleted" : ""}
                    </span>
                  </Td>
                  <Td>
                    <span className="block truncate">{booking.customerName}</span>
                    <span className="block truncate text-xs text-[var(--color-muted-foreground)]">
                      {booking.email}
                    </span>
                  </Td>
                  <Td muted>
                    <DateRange start={booking.startDate} end={booking.endDate} />
                  </Td>
                  <Td>
                    <Badge tone={booking.deliveryType === "DELIVERY" ? "info" : "neutral"}>
                      {booking.deliveryType === "DELIVERY" ? "Delivery" : "Collection"}
                    </Badge>
                  </Td>
                  <Td>
                    <StatusBadge statusKey={booking.statusKey} />
                  </Td>
                  <Td numeric>
                    {booking.remainingMinor > 0 ? (
                      <span className="font-medium text-amber-700">
                        <Money
                          amountMinor={booking.remainingMinor}
                          currency={booking.currency}
                        />
                      </span>
                    ) : (
                      <span className="text-[var(--color-muted-foreground)]">—</span>
                    )}
                  </Td>
                  <Td numeric>
                    <Money amountMinor={booking.totalMinor} currency={booking.currency} />
                  </Td>
                </Tr>
              ))
            )}
          </TBody>
        </Table>

        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={result.total}
          buildHref={hrefForPage}
          renderLink={({ href, className, children }) => (
            <Link href={href} className={className}>
              {children}
            </Link>
          )}
        />
      </TableContainer>
    </Page>
  );
}
