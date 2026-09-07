"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  CardHeader,
  Checkbox,
  EmptyState,
  Money,
  useToast,
} from "@rentora/ui";
import { linkUpsellAction, unlinkUpsellAction } from "@/lib/actions/catalog";
import type { Product, UpsellProduct } from "@/lib/types";

export function ProductUpsells({
  product,
  allUpsells,
  currency,
}: {
  product: Product;
  allUpsells: UpsellProduct[];
  currency: string;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const linkedIds = new Set((product.upsells ?? []).map((link) => link.upsellProduct.id));

  function toggle(upsell: UpsellProduct, shouldLink: boolean) {
    startTransition(async () => {
      const result = shouldLink
        ? await linkUpsellAction(product.id, upsell.id)
        : await unlinkUpsellAction(product.id, upsell.id);

      toast(
        result.error
          ? { title: "Could not update", description: result.error, tone: "error" }
          : { title: shouldLink ? `${upsell.name} offered` : `${upsell.name} removed` },
      );
    });
  }

  return (
    <Card>
      <CardHeader
        title="Offer these with the product"
        description="Ticked add-ons appear on this product page and can be added to the same booking."
        action={
          <Button variant="secondary" size="sm" asChild>
            <Link href="/admin/upsells">Manage add-ons</Link>
          </Button>
        }
      />

      {allUpsells.length === 0 ? (
        <EmptyState
          title="No add-ons yet"
          description="Add-ons are the small extras — setup crew, heaters, a dance floor — that lift the value of each booking."
          action={
            <Button asChild>
              <Link href="/admin/upsells">Create an add-on</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-line-soft">
          {allUpsells.map((upsell) => (
            <li key={upsell.id} className="flex items-center justify-between gap-4 py-3">
              <Checkbox
                checked={linkedIds.has(upsell.id)}
                disabled={pending}
                onChange={(e) => toggle(upsell, e.target.checked)}
                label={upsell.name}
                description={upsell.description ?? undefined}
              />
              <span className="shrink-0 text-[13.5px] font-medium">
                <Money amountMinor={upsell.priceMinor} currency={upsell.currency ?? currency} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
