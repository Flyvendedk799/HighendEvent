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
  Money,
  Textarea,
  useToast,
} from "@rentora/ui";
import { saveDeliverySettingsAction, type DeliverySetting } from "@/lib/actions/operations";
import { minorToMajor } from "@/components/admin/product-form";

export function DeliveryForm({
  delivery,
  pickup,
  currency,
  canEnableDelivery,
}: {
  delivery?: DeliverySetting;
  pickup?: DeliverySetting;
  currency: string;
  canEnableDelivery: boolean;
}) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(saveDeliverySettingsAction, {});

  const [enabled, setEnabled] = useState(delivery?.isActive ?? false);
  const [baseFee, setBaseFee] = useState(minorToMajor(delivery?.baseFeeMinor ?? 0));
  const [perKm, setPerKm] = useState(minorToMajor(delivery?.perKmFeeMinor ?? 0));
  const [freeKm, setFreeKm] = useState(String(delivery?.freeDeliveryKm ?? 0));

  useEffect(() => {
    if (state.ok) toast({ title: "Delivery settings saved" });
  }, [state.ok, state, toast]);

  // Worked example, so a tenant can see what a customer would actually be charged.
  const exampleKm = 18;
  const chargeableKm = Math.max(0, exampleKm - (Number(freeKm) || 0));
  const exampleFeeMinor =
    chargeableKm === 0
      ? 0
      : Math.round(Number(baseFee) * 100 + chargeableKm * Number(perKm) * 100);

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? <Banner tone="danger">{state.error}</Banner> : null}

      <Card>
        <CardHeader title="Collection" description="Customers picking up from you." />
        <div className="space-y-4">
          <Checkbox
            name="pickupEnabled"
            defaultChecked={pickup?.isActive ?? true}
            label="Offer collection"
          />
          <Input
            name="pickupFee"
            label="Collection fee"
            inputMode="decimal"
            suffix={currency}
            defaultValue={minorToMajor(pickup?.baseFeeMinor ?? 0)}
            hint="Usually zero."
          />
          <Textarea
            name="pickupNotes"
            label="Collection instructions"
            rows={2}
            defaultValue={pickup?.notes ?? ""}
            placeholder="Where to come, opening hours, what to bring."
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Delivery"
          description="Quoted at checkout from the customer address."
        />

        {!canEnableDelivery ? (
          <Banner tone="warning" className="mb-4">
            Delivery cannot be switched on until your main location has coordinates.
          </Banner>
        ) : null}

        <div className="space-y-4">
          <Checkbox
            name="deliveryEnabled"
            checked={enabled}
            disabled={!canEnableDelivery}
            onChange={(e) => setEnabled(e.target.checked)}
            label="Offer delivery"
            description="Shoppers see a delivery option and a real quote before they pay."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="baseFee"
              label="Base fee"
              inputMode="decimal"
              suffix={currency}
              value={baseFee}
              onChange={(e) => setBaseFee(e.target.value)}
              disabled={!enabled}
              hint="Charged on every delivery beyond the free radius."
            />
            <Input
              name="perKmFee"
              label="Per kilometre"
              inputMode="decimal"
              suffix={currency}
              value={perKm}
              onChange={(e) => setPerKm(e.target.value)}
              disabled={!enabled}
            />
            <Input
              name="freeDeliveryKm"
              label="Free radius"
              type="number"
              min={0}
              suffix="km"
              value={freeKm}
              onChange={(e) => setFreeKm(e.target.value)}
              disabled={!enabled}
              hint="Deliveries inside this are free."
            />
            <Input
              name="maxDeliveryKm"
              label="Maximum radius"
              type="number"
              min={0}
              suffix="km"
              defaultValue={delivery?.maxDeliveryKm ?? ""}
              disabled={!enabled}
              hint="Beyond this, delivery is refused at checkout. Blank for no limit."
            />
          </div>

          <Textarea
            name="deliveryNotes"
            label="Delivery notes"
            rows={2}
            defaultValue={delivery?.notes ?? ""}
            disabled={!enabled}
            placeholder="Access requirements, whether you set up, typical delivery windows."
          />

          {enabled ? (
            <div className="rounded-lg bg-[var(--color-muted)] p-3 text-sm">
              <p className="font-medium">A {exampleKm} km delivery would cost</p>
              <p className="mt-1 text-lg font-semibold">
                <Money amountMinor={exampleFeeMinor} currency={currency} />
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                {chargeableKm === 0
                  ? `Inside your ${freeKm} km free radius.`
                  : `Base + ${chargeableKm} chargeable km.`}
              </p>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="flex justify-end">
        <SaveButton />
      </div>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Save delivery settings
    </Button>
  );
}
