"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  Banner,
  Button,
  Card,
  CardHeader,
  Input,
  Money,
  Select,
  Spinner,
  Textarea,
} from "@rentora/ui";
import { Trash2 } from "lucide-react";
import {
  createManualBookingAction,
  previewManualBookingAction,
} from "@/lib/actions/bookings";
import type { PricingBreakdown, Product } from "@/lib/types";

type Line = { productId: string; quantity: number };

export function ManualBookingForm({
  products,
  currency,
  deliveryEnabled,
}: {
  products: Product[];
  currency: string;
  deliveryEnabled: boolean;
}) {
  const [state, formAction] = useActionState(createManualBookingAction, {});
  const [lines, setLines] = useState<Line[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");

  const [quote, setQuote] = useState<PricingBreakdown | null>(null);
  const [conflicts, setConflicts] = useState<Array<{ productId: string; message: string }>>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, startPreview] = useTransition();

  const err = state.fieldErrors ?? {};

  // Preview price and availability before anything is written, which is what makes this
  // usable on the phone with a customer waiting.
  useEffect(() => {
    if (lines.length === 0 || !startDate || !endDate || endDate < startDate) {
      setQuote(null);
      setConflicts([]);
      return;
    }

    const timer = setTimeout(() => {
      startPreview(async () => {
        const result = await previewManualBookingAction({
          items: lines,
          startDate,
          endDate,
          deliveryFeeMinor: Math.round((Number(deliveryFee) || 0) * 100),
        });
        setQuote((result.quote as PricingBreakdown) ?? null);
        setConflicts(result.conflicts ?? []);
        setPreviewError(result.error ?? null);
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [lines, startDate, endDate, deliveryFee]);

  function addLine() {
    const firstUnused = products.find((p) => !lines.some((l) => l.productId === p.id));
    if (!firstUnused) return;
    setLines((current) => [...current, { productId: firstUnused.id, quantity: 1 }]);
  }

  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? id;

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <input type="hidden" name="items" value={JSON.stringify(lines)} />

      <div className="space-y-6">
        {state.error ? <Banner tone="danger">{state.error}</Banner> : null}

        <Card>
          <CardHeader title="Dates" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="startDate"
              type="date"
              label="From"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              error={err.startDate}
            />
            <Input
              name="endDate"
              type="date"
              label="To"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              error={err.endDate}
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Items"
            action={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addLine}
                disabled={lines.length >= products.length}
              >
                Add item
              </Button>
            }
          />

          {lines.length === 0 ? (
            <p className="py-4 text-[13.5px] text-paper-mute">
              No items yet. Add what the customer is renting.
            </p>
          ) : (
            <ul className="space-y-3">
              {lines.map((line, index) => {
                const conflict = conflicts.find((c) => c.productId === line.productId);
                return (
                  <li key={index} className="space-y-1.5">
                    <div className="flex items-end gap-2">
                      <div className="min-w-0 flex-1">
                        <Select
                          aria-label="Product"
                          value={line.productId}
                          onChange={(e) =>
                            setLines((current) =>
                              current.map((l, i) =>
                                i === index ? { ...l, productId: e.target.value } : l,
                              ),
                            )
                          }
                          options={products.map((p) => ({ value: p.id, label: p.name }))}
                        />
                      </div>
                      <Input
                        aria-label="Quantity"
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) =>
                          setLines((current) =>
                            current.map((l, i) =>
                              i === index
                                ? { ...l, quantity: Math.max(1, Number(e.target.value) || 1) }
                                : l,
                            ),
                          )
                        }
                        className="w-20"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${productName(line.productId)}`}
                        onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                    {conflict ? (
                      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-warn">{conflict.message}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Customer" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                name="customerName"
                label="Name"
                required
                error={err.customerName}
              />
            </div>
            <Input name="email" type="email" label="Email" required error={err.email} />
            <Input name="phone" type="tel" label="Phone" required error={err.phone} />
            <div className="sm:col-span-2">
              <Input name="address" label="Address" />
            </div>
            <Input name="zipCode" label="Postcode" />
            <Input name="city" label="City" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Fulfilment" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              name="deliveryType"
              label="How is it going out?"
              defaultValue="PICKUP"
              options={[
                { value: "PICKUP", label: "Customer collects" },
                ...(deliveryEnabled ? [{ value: "DELIVERY", label: "We deliver" }] : []),
              ]}
            />
            <Input
              name="deliveryFee"
              label="Delivery fee"
              inputMode="decimal"
              suffix={currency}
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              hint="Charged as agreed with the customer."
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Notes" />
          <div className="space-y-4">
            <Textarea name="notes" label="Customer notes" rows={2} />
            <Textarea name="internalNotes" label="Internal notes" rows={2} />
          </div>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader title="Price preview" />

          {previewError ? <Banner tone="danger">{previewError}</Banner> : null}

          {previewing ? (
            <p className="flex items-center gap-2 text-[13.5px] text-paper-mute">
              <Spinner /> Checking availability and pricing…
            </p>
          ) : quote ? (
            <dl className="space-y-1.5 text-[13.5px]">
              {quote.lineItems.map((line, i) => (
                <Row
                  key={i}
                  label={`${line.name} × ${line.quantity}`}
                  value={<Money amountMinor={line.totalPriceMinor} currency={currency} />}
                />
              ))}
              {quote.depositMinor > 0 ? (
                <Row
                  label="Deposit"
                  value={<Money amountMinor={quote.depositMinor} currency={currency} />}
                />
              ) : null}
              {quote.taxMinor > 0 ? (
                <Row
                  label="Tax"
                  value={<Money amountMinor={quote.taxMinor} currency={currency} />}
                />
              ) : null}
              <div className="mt-2 flex items-baseline justify-between border-t border-line pt-2">
                <dt className="font-semibold">Total</dt>
                <dd className="font-mono text-[17px] font-medium tabular-nums">
                  <Money amountMinor={quote.totalMinor} currency={currency} />
                </dd>
              </div>
              {quote.remainingMinor > 0 ? (
                <p className="pt-1 font-mono text-[11px] text-paper-faint">
                  Deposit of <Money amountMinor={quote.upfrontMinor} currency={currency} /> due
                  first.
                </p>
              ) : null}
            </dl>
          ) : (
            <p className="text-[13.5px] text-paper-mute">
              Choose dates and items to see the price.
            </p>
          )}

          {conflicts.length > 0 ? (
            <Banner tone="warning" className="mt-4">
              Some items are short on those dates. Saving will be refused until that is resolved.
            </Banner>
          ) : null}

          <SubmitButton disabled={lines.length === 0 || conflicts.length > 0} />
        </Card>
      </aside>
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="mt-5 w-full" loading={pending} disabled={disabled}>
      Create booking
    </Button>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="min-w-0 truncate text-paper-mute">{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}
