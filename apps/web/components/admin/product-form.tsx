"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Banner,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Input,
  Select,
  Textarea,
  useToast,
} from "@rentora/ui";
import type { ActionState } from "@/lib/actions/action-state";
import type { Category, Product } from "@/lib/types";

export function minorToMajor(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return "";
  return (minor / 100).toFixed(2).replace(/\.00$/, "");
}

export type ProductFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Category[];
  currency: string;
  product?: Product;
  submitLabel: string;
};

export function ProductForm({
  action,
  categories,
  currency,
  product,
  submitLabel,
}: ProductFormProps) {
  const [state, formAction] = useActionState(action, {});
  const { toast } = useToast();
  const [name, setName] = useState(product?.name ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [slug, setSlug] = useState(product?.slug ?? "");

  useEffect(() => {
    if (state.ok) toast({ title: "Product saved" });
  }, [state.ok, state, toast]);

  // A new product gets its slug written for you; editing never rewrites a live URL silently.
  useEffect(() => {
    if (!slugTouched) setSlug(autoSlug(name));
  }, [name, slugTouched]);

  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? <Banner tone="danger">{state.error}</Banner> : null}

      <Card>
        <CardHeader title="General" description="How this item appears in your catalog." />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              name="name"
              label="Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={err.name}
              placeholder="6×12m Marquee"
            />
          </div>
          <Input
            name="slug"
            label="URL slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            error={err.slug}
            hint="Used in the storefront address."
          />
          <Select
            name="categoryId"
            label="Category"
            required
            defaultValue={product?.categoryId ?? ""}
            error={err.categoryId}
            placeholder={categories.length ? "Choose a category" : "Create a category first"}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <div className="sm:col-span-2">
            <Textarea
              name="description"
              label="Description"
              defaultValue={product?.description ?? ""}
              rows={4}
              hint="Shown on the product page. Say what is included and what the customer supplies."
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Pricing"
          description={`Amounts in ${currency}. Weekend rates and the Friday–Sunday package are optional.`}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            name="dailyPrice"
            label="Daily rate"
            required
            inputMode="decimal"
            suffix={currency}
            defaultValue={minorToMajor(product?.dailyPriceMinor)}
            error={err.dailyPrice}
          />
          <Input
            name="weekendPrice"
            label="Weekend day rate"
            inputMode="decimal"
            suffix={currency}
            defaultValue={minorToMajor(product?.weekendPriceMinor)}
            hint="Applies to Saturdays and Sundays."
          />
          <Input
            name="weekendPackage"
            label="Fri–Sun package"
            inputMode="decimal"
            suffix={currency}
            defaultValue={minorToMajor(product?.weekendPackageMinor)}
            hint="Total for the whole three-day weekend."
          />
          <Input
            name="deposit"
            label="Refundable deposit"
            inputMode="decimal"
            suffix={currency}
            defaultValue={minorToMajor(product?.depositMinor)}
            hint="Charged up front, returned after inspection."
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Stock and turnaround"
          description="Buffers block the calendar either side of a booking so the crew can clean and reload."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            name="stockQty"
            label="Units owned"
            type="number"
            min={1}
            required
            defaultValue={product?.stockQty ?? 1}
            error={err.stockQty}
          />
          <Input
            name="prepBufferDays"
            label="Prep buffer"
            type="number"
            min={0}
            suffix="days"
            defaultValue={product?.prepBufferDays ?? 0}
          />
          <Input
            name="cleanupBufferDays"
            label="Cleanup buffer"
            type="number"
            min={0}
            suffix="days"
            defaultValue={product?.cleanupBufferDays ?? 0}
          />
          <Input
            name="minRentalDays"
            label="Minimum rental"
            type="number"
            min={1}
            suffix="days"
            defaultValue={product?.minRentalDays ?? 1}
            error={err.minRentalDays}
          />
          <Input
            name="maxRentalDays"
            label="Maximum rental"
            type="number"
            min={1}
            suffix="days"
            defaultValue={product?.maxRentalDays ?? ""}
            error={err.maxRentalDays}
            hint="Leave blank for no limit."
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Visibility" />
        <Checkbox
          name="isActive"
          defaultChecked={product?.isActive ?? true}
          label="Published to the storefront"
          description="Unpublished products stay in your admin but never appear in the catalog or search."
        />
      </Card>

      <div className="flex justify-end gap-2">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}

function autoSlug(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
