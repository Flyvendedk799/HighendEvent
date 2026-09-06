"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Card, Select } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { clientApi } from "@/lib/client-api";

type Product = { id: string; name: string; stockQty: number };
type DayCell = {
  date: string;
  availableQuantity: number;
  isBlackedOut: boolean;
  isAvailable: boolean;
};

function monthRange(anchor: Date) {
  const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export default function AdminCalendarPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [days, setDays] = useState<DayCell[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  });

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const range = useMemo(() => monthRange(month), [month]);

  useEffect(() => {
    void (async () => {
      try {
        const rows = await clientApi<Product[]>("/catalog/products");
        setProducts(rows);
        if (!productId && rows[0]) setProductId(rows[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load products");
      }
    })();
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    void (async () => {
      try {
        const data = await clientApi<DayCell[]>(
          `/availability/calendar?productId=${encodeURIComponent(productId)}&startDate=${range.startDate}&endDate=${range.endDate}`,
        );
        setDays(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load calendar");
        setDays([]);
      }
    })();
  }, [productId, range.startDate, range.endDate]);

  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const leading = (month.getUTCDay() + 6) % 7; // Monday-first
  const totalDays = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
  const cells: Array<{ day: number; iso: string } | null> = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => {
      const day = i + 1;
      const iso = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day))
        .toISOString()
        .slice(0, 10);
      return { day, iso };
    }),
  ];

  const label = month.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <main>
      <PageHeader
        title="Calendar"
        description="Occupancy from the same availability engine as the storefront."
      />
      <Card>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <button
              type="button"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              onClick={() =>
                setMonth(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() - 1, 1)))
              }
            >
              Previous
            </button>
            <h2 className="font-display text-xl font-semibold">{label}</h2>
            <button
              type="button"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              onClick={() =>
                setMonth(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1)))
              }
            >
              Next
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              label="Product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <a
              href={`${apiBase}/bookings/calendar.ics`}
              className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-900 hover:bg-teal-100"
            >
              Download ICS feed
            </a>
            {productId ? (
              <Link href={`/admin/products/${productId}`} className="text-sm text-teal-800 hover:underline">
                Edit product
              </Link>
            ) : null}
          </div>
        </div>
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          <Badge tone="success">Available</Badge>
          <Badge tone="warning">Low stock</Badge>
          <Badge tone="danger">Blackout / full</Badge>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-xs text-slate-500">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="py-1 font-medium">
              {d}
            </div>
          ))}
          {cells.map((cell, idx) => {
            if (!cell) return <div key={`e-${idx}`} />;
            const info = byDate.get(cell.iso);
            const qty = info?.availableQuantity ?? null;
            const blocked = Boolean(info?.isBlackedOut || (info != null && !info.isAvailable));
            const low = qty != null && qty > 0 && qty <= 2;
            const className = blocked
              ? "border-red-200 bg-red-50 text-red-900"
              : low
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : "border-teal-200 bg-teal-50 text-teal-900";
            return (
              <div key={cell.iso} className={`min-h-16 rounded-lg border p-2 text-left text-sm ${className}`}>
                <div className="font-medium">{cell.day}</div>
                <div className="mt-2 text-[10px]">
                  {info == null
                    ? "—"
                    : blocked
                      ? info.isBlackedOut
                        ? "Blackout"
                        : "Full"
                      : `${qty} left`}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </main>
  );
}
