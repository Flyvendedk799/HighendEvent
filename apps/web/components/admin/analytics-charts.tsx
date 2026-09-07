"use client";

import { Card, CardHeader, formatMoneyMinor } from "@rentora/ui";
import { BarList, ColumnChart, DataTable, Funnel } from "@/components/admin/charts";
import type {
  Conversion,
  RevenuePoint,
  UtilisationRow,
  WeekdayLoad,
} from "@/app/(admin)/admin/(console)/analytics/page";

function monthLabel(month: string, locale: string): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  return new Intl.DateTimeFormat(locale === "da" ? "da-DK" : "en-GB", {
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function monthFull(month: string, locale: string): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  return new Intl.DateTimeFormat(locale === "da" ? "da-DK" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function AnalyticsCharts({
  revenue,
  utilisation,
  conversion,
  weekday,
  currency,
  locale,
}: {
  revenue: RevenuePoint[];
  utilisation: UtilisationRow[];
  conversion: Conversion | null;
  weekday: WeekdayLoad;
  currency: string;
  locale: string;
}) {
  const money = (minor: number) => formatMoneyMinor(minor, currency, locale);

  const topByRevenue = utilisation.slice(0, 8);
  const topByUtilisation = [...utilisation]
    .sort((a, b) => b.utilisationBps - a.utilisationBps)
    .slice(0, 8);

  return (
    <>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Revenue by month"
            description="Booking value in the month the booking was taken. Cancelled bookings are excluded."
          />
          <ColumnChart
            points={revenue.map((point) => ({
              label: monthLabel(point.month, locale),
              value: point.revenueMinor,
              caption: monthFull(point.month, locale),
            }))}
            format={money}
            emptyLabel="No revenue recorded in the last 12 months"
          />
          <DataTable
            caption="Revenue and booking count by month"
            columns={["Month", "Revenue", "Bookings"]}
            rows={revenue.map((point) => [
              monthFull(point.month, locale),
              money(point.revenueMinor),
              point.bookings,
            ])}
          />
        </Card>

        <Card>
          <CardHeader
            title="Busiest days"
            description="How many bookings are out on each weekday, over the last 90 days."
          />
          <ColumnChart
            points={weekday.map((day) => ({ label: day.label, value: day.count }))}
            format={(value) => `${value} booking${value === 1 ? "" : "s"}`}
            emptyLabel="No bookings in the last 90 days"
            height={140}
          />
          <DataTable
            caption="Bookings out per weekday"
            columns={["Day", "Bookings out"]}
            rows={weekday.map((day) => [day.label, day.count])}
          />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Revenue by product"
            description="Last 90 days, from the rate actually charged."
          />
          <BarList
            points={topByRevenue.map((row) => ({
              label: row.name,
              value: row.revenueMinor,
              caption: `${row.bookings} booking${row.bookings === 1 ? "" : "s"}`,
            }))}
            format={money}
            emptyLabel="No product revenue in the last 90 days"
          />
        </Card>

        <Card>
          <CardHeader
            title="Utilisation"
            description="Share of unit-days actually rented over the last 90 days. Low numbers mean idle stock."
          />
          <BarList
            points={topByUtilisation.map((row) => ({
              label: row.name,
              value: row.utilisationBps / 100,
              caption: `${row.rentedUnitDays} of ${row.availableUnitDays} unit-days · ${row.stockQty} owned`,
            }))}
            format={(value) => `${value.toFixed(0)}%`}
            emptyLabel="Nothing has been rented in the last 90 days"
            trackLabel="available unit-days"
          />
          <DataTable
            caption="Utilisation by product"
            columns={["Product", "Owned", "Rented unit-days", "Utilisation"]}
            rows={utilisation.map((row) => [
              row.name,
              row.stockQty,
              row.rentedUnitDays,
              `${(row.utilisationBps / 100).toFixed(0)}%`,
            ])}
          />
        </Card>
      </div>

      {conversion ? (
        <Card className="mt-6 max-w-xl">
          <CardHeader
            title="From cart to paid"
            description={`Last ${conversion.windowDays} days. A cart is counted the first time someone adds an item.`}
          />
          <Funnel
            stages={[
              { label: "Carts started", value: conversion.cartsStarted },
              {
                label: "Bookings created",
                value: conversion.bookingsCreated,
                hint: `${(conversion.cartToBookingBps / 100).toFixed(0)}% of carts reached checkout`,
              },
              {
                label: "Bookings paid",
                value: conversion.bookingsPaid,
                hint: `${(conversion.bookingToPaidBps / 100).toFixed(0)}% of bookings were paid`,
              },
            ]}
          />
          {conversion.bookingsCancelled > 0 ? (
            <p className="mt-3 font-mono text-[11px] text-paper-faint">
              {conversion.bookingsCancelled} booking
              {conversion.bookingsCancelled === 1 ? " was" : "s were"} cancelled in this window.
            </p>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}
