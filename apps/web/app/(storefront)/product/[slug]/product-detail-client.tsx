"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Input } from "@rentora/ui";
import { formatPrice, type DemoProduct } from "@/lib/demo-data";

export function ProductDetailClient({ product }: { product: DemoProduct }) {
  const [qty, setQty] = useState(1);

  return (
    <main className="grid gap-10 lg:grid-cols-2">
      <div
        className={`min-h-[320px] rounded-3xl bg-gradient-to-br ${
          product.imageTone === "teal"
            ? "from-teal-700 to-teal-400"
            : product.imageTone === "amber"
              ? "from-amber-600 to-amber-300"
              : "from-slate-700 to-slate-400"
        } relative overflow-hidden`}
      >
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_70%_30%,white,transparent_40%)]" />
      </div>
      <div className="space-y-6">
        <div>
          <Badge tone="accent">{product.category}</Badge>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">{product.name}</h1>
          <p className="mt-3 text-muted-foreground">{product.description}</p>
        </div>
        <p className="text-2xl font-semibold">
          {formatPrice(product.priceFrom, product.currency)}
          <span className="text-base font-normal text-muted-foreground"> / day</span>
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input type="date" name="start" label="Start date" defaultValue="2026-09-20" />
          <Input type="date" name="end" label="End date" defaultValue="2026-09-21" />
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            name="qty"
            label="Quantity"
            min={1}
            max={product.stock}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value) || 1)}
            className="max-w-[140px]"
          />
          <p className="pt-6 text-sm text-muted-foreground">{product.stock} available</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/cart">
            <Button size="lg">Add to cart</Button>
          </Link>
          <Link href="/catalog">
            <Button size="lg" variant="secondary">
              Back to catalog
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
