import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Badge,
  Banner,
  Breadcrumbs,
  Card,
  CardHeader,
  DataList,
  DateRange,
  DetailLayout,
  Money,
  Page,
  PageHeader,
  StatusBadge,
  Table,
  TableContainer,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@rentora/ui";
import { BookingActions } from "@/components/admin/booking-actions";
import { BookingNotes } from "@/components/admin/booking-notes";
import { BookingSchedule } from "@/components/admin/booking-schedule";
import { BookingReturn } from "@/components/admin/booking-return";
import { serverGet } from "@/lib/server-api";
import { isApiError } from "@/lib/api";
import type { Booking } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const booking = await serverGet<Booking>(`/bookings/${id}`);
    return { title: booking.bookingNo };
  } catch {
    return { title: "Booking" };
  }
}

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; paid?: string }>;
}) {
  const { id } = await params;
  const { created, paid } = await searchParams;

  let booking: Booking;
  try {
    booking = await serverGet<Booking>(`/bookings/${id}`, { cache: "no-store" });
  } catch (err) {
    if (isApiError(err) && err.status === 404) notFound();
    throw err;
  }

  const transitions = await serverGet<Array<{ key: string; label: string }>>(
    `/bookings/${id}/transitions`,
    { cache: "no-store" },
  ).catch(() => []);

  const paidMinor = booking.totalMinor - booking.remainingMinor;
  const upsellTotal = booking.items.reduce(
    (sum, item) =>
      sum +
      ((item as { upsells?: Array<{ unitPriceMinor: number; quantity: number }> }).upsells ?? [])
        .reduce((inner, link) => inner + link.unitPriceMinor * link.quantity, 0),
    0,
  );

  return (
    <Page>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[{ label: "Bookings", href: "/admin/bookings" }, { label: booking.bookingNo }]}
          />
        }
        title={booking.bookingNo}
        status={<StatusBadge statusKey={booking.statusKey} />}
        description={
          <>
            {booking.source === "MANUAL" ? "Taken by staff" : "Booked online"} ·{" "}
            {new Date(booking.createdAt).toLocaleDateString()}
          </>
        }
        action={<BookingActions booking={booking} transitions={transitions} />}
      />

      {created ? (
        <Banner tone="success" title="Booking created" className="mb-6">
          It is already blocking those dates on the calendar.
        </Banner>
      ) : null}

      {paid ? (
        <Banner tone="success" title="Balance collected" className="mb-6">
          The outstanding amount has been settled.
        </Banner>
      ) : null}

      {booking.isDeleted ? (
        <Banner tone="warning" title="This booking is deleted" className="mb-6">
          It no longer holds stock and is hidden from the default list. You can restore it from
          the actions menu.
        </Banner>
      ) : null}

      <DetailLayout
        aside={
          <>
            <Card>
              <CardHeader title="Payment" />
              <DataList
                items={[
                  {
                    label: "Rental",
                    value: (
                      <Money
                        amountMinor={booking.subtotalMinor - upsellTotal}
                        currency={booking.currency}
                      />
                    ),
                  },
                  ...(upsellTotal > 0
                    ? [
                        {
                          label: "Add-ons",
                          value: <Money amountMinor={upsellTotal} currency={booking.currency} />,
                        },
                      ]
                    : []),
                  ...(booking.deliveryFeeMinor > 0
                    ? [
                        {
                          label: "Delivery",
                          value: (
                            <Money
                              amountMinor={booking.deliveryFeeMinor}
                              currency={booking.currency}
                            />
                          ),
                        },
                      ]
                    : []),
                  ...(booking.taxMinor > 0
                    ? [
                        {
                          label: "Tax",
                          value: (
                            <Money amountMinor={booking.taxMinor} currency={booking.currency} />
                          ),
                        },
                      ]
                    : []),
                  ...(booking.depositMinor > 0
                    ? [
                        {
                          label: "Deposit",
                          value: (
                            <Money
                              amountMinor={booking.depositMinor}
                              currency={booking.currency}
                            />
                          ),
                        },
                      ]
                    : []),
                  ...(booking.damageFeeMinor > 0
                    ? [
                        {
                          label: "Damage fee",
                          value: (
                            <Money
                              amountMinor={booking.damageFeeMinor}
                              currency={booking.currency}
                            />
                          ),
                        },
                      ]
                    : []),
                  {
                    label: "Total",
                    value: <Money amountMinor={booking.totalMinor} currency={booking.currency} />,
                  },
                  {
                    label: "Paid",
                    value: <Money amountMinor={paidMinor} currency={booking.currency} />,
                  },
                  {
                    label: "Outstanding",
                    value:
                      booking.remainingMinor > 0 ? (
                        <span className="text-amber-700">
                          <Money
                            amountMinor={booking.remainingMinor}
                            currency={booking.currency}
                          />
                        </span>
                      ) : (
                        <span className="text-[var(--color-muted-foreground)]">Settled</span>
                      ),
                  },
                ]}
              />

              {booking.stripePaymentIntentId ? (
                <p className="mt-3 truncate text-[11px] text-[var(--color-muted-foreground)]">
                  Stripe: {booking.stripePaymentIntentId}
                </p>
              ) : null}
            </Card>

            <Card>
              <CardHeader title="Customer" />
              <p className="font-medium">{booking.customerName}</p>
              <p className="mt-0.5 text-sm">
                <a href={`mailto:${booking.email}`} className="hover:underline">
                  {booking.email}
                </a>
              </p>
              <p className="text-sm">
                <a href={`tel:${booking.phone.replace(/\s/g, "")}`} className="hover:underline">
                  {booking.phone}
                </a>
              </p>
              {booking.customerId ? (
                <Link
                  href={`/admin/customers/${booking.customerId}`}
                  className="mt-3 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  View customer history →
                </Link>
              ) : null}
            </Card>

            <Card>
              <CardHeader title={booking.deliveryType === "DELIVERY" ? "Delivery" : "Collection"} />
              <Badge tone={booking.deliveryType === "DELIVERY" ? "info" : "neutral"}>
                {booking.deliveryType === "DELIVERY" ? "We deliver" : "Customer collects"}
              </Badge>
              <address className="mt-2 not-italic text-sm text-[var(--color-muted-foreground)]">
                {booking.address}
                <br />
                {booking.zipCode} {booking.city}
                <br />
                {booking.country}
              </address>
              {booking.deliveryType === "DELIVERY" ? (
                <a
                  className="mt-2 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${booking.address}, ${booking.zipCode} ${booking.city}`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in maps →
                </a>
              ) : null}
            </Card>
          </>
        }
      >
        <Card>
          <CardHeader title="Schedule" />
          <p className="text-lg font-medium">
            <DateRange start={booking.startDate} end={booking.endDate} />
          </p>
          <BookingSchedule booking={booking} />
        </Card>

        <Card className="p-0">
          <div className="px-5 pt-5">
            <CardHeader title="Items" />
          </div>
          <TableContainer className="rounded-none border-0 shadow-none">
            <Table>
              <THead>
                <Tr>
                  <Th>Item</Th>
                  <Th align="right">Qty</Th>
                  <Th align="right">Per day</Th>
                  <Th align="right">Line total</Th>
                </Tr>
              </THead>
              <TBody>
                {booking.items.map((item) => {
                  const upsells =
                    (item as {
                      upsells?: Array<{
                        id: string;
                        nameSnapshot: string;
                        quantity: number;
                        unitPriceMinor: number;
                      }>;
                    }).upsells ?? [];

                  return (
                    <Tr key={item.id}>
                      <Td>
                        <span className="font-medium">{item.nameSnapshot}</span>
                        {upsells.length > 0 ? (
                          <ul className="mt-1 space-y-0.5 text-xs text-[var(--color-muted-foreground)]">
                            {upsells.map((upsell) => (
                              <li key={upsell.id}>
                                + {upsell.nameSnapshot} × {upsell.quantity} (
                                <Money
                                  amountMinor={upsell.unitPriceMinor * upsell.quantity}
                                  currency={booking.currency}
                                />
                                )
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </Td>
                      <Td numeric>{item.quantity}</Td>
                      <Td numeric muted>
                        <Money amountMinor={item.unitPriceMinor} currency={booking.currency} />
                      </Td>
                      <Td numeric>
                        <Money
                          amountMinor={item.unitPriceMinor * item.quantity * daysOf(booking)}
                          currency={booking.currency}
                        />
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          </TableContainer>
        </Card>

        <BookingReturn booking={booking} />
        <BookingNotes booking={booking} />
      </DetailLayout>
    </Page>
  );
}

function daysOf(booking: Booking): number {
  const start = new Date(booking.startDate).getTime();
  const end = new Date(booking.endDate).getTime();
  return Math.round((end - start) / 86_400_000) + 1;
}
