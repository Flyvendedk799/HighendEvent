"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import {
  Banner,
  Button,
  Card,
  CardHeader,
  Input,
  Money,
  Select,
  Textarea,
  useToast,
} from "@rentora/ui";
import { recordReturnAction } from "@/lib/actions/bookings";
import { minorToMajor } from "@/components/admin/product-form";
import type { Booking } from "@/lib/types";

const RETURNED_STATUSES = new Set([
  "out_for_delivery",
  "returned_good",
  "returned_damaged",
  "deposit_refunded",
]);

export function BookingReturn({ booking }: { booking: Booking }) {
  const { toast } = useToast();
  const action = recordReturnAction.bind(null, booking.id);
  const [state, formAction] = useActionState(action, {});

  useEffect(() => {
    if (state.ok) toast({ title: "Return recorded" });
  }, [state.ok, state, toast]);

  // Before the kit has gone out there is nothing to inspect, so this stays out of the way.
  if (!RETURNED_STATUSES.has(booking.statusKey)) return null;

  return (
    <Card>
      <CardHeader
        title="Return and condition"
        description="Recorded when the kit comes back. A damage fee is added to the outstanding balance."
      />

      {state.error ? (
        <Banner tone="danger" className="mb-4">
          {state.error}
        </Banner>
      ) : null}

      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            name="returnCondition"
            label="Condition"
            defaultValue={booking.returnCondition ?? ""}
            options={[
              { value: "", label: "Not inspected yet" },
              { value: "good", label: "Good — nothing to charge" },
              { value: "minor", label: "Minor wear" },
              { value: "damaged", label: "Damaged" },
              { value: "missing", label: "Items missing" },
            ]}
          />
          <Input
            name="damageFee"
            label="Damage fee"
            inputMode="decimal"
            suffix={booking.currency}
            defaultValue={minorToMajor(booking.damageFeeMinor)}
            hint="Leave at zero if nothing is owed."
          />
        </div>

        <Textarea
          name="internalNotes"
          label="Inspection notes"
          rows={3}
          defaultValue={booking.internalNotes ?? ""}
          placeholder="What was damaged, what was charged, who inspected it."
        />

        {booking.damageFeeMinor > 0 ? (
          <p className="font-mono text-[11px] text-paper-faint">
            Currently charging{" "}
            <Money amountMinor={booking.damageFeeMinor} currency={booking.currency} /> for damage.
          </p>
        ) : null}

        <div className="flex justify-end">
          <SaveButton />
        </div>
      </form>
    </Card>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" loading={pending}>
      Record return
    </Button>
  );
}
