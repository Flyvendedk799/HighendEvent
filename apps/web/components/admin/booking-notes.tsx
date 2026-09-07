"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Banner, Button, Card, CardHeader, Textarea, useToast } from "@rentora/ui";
import { updateBookingNotesAction } from "@/lib/actions/bookings";
import type { Booking } from "@/lib/types";

export function BookingNotes({ booking }: { booking: Booking }) {
  const { toast } = useToast();
  const action = updateBookingNotesAction.bind(null, booking.id);
  const [state, formAction] = useActionState(action, {});

  useEffect(() => {
    if (state.ok) toast({ title: "Notes saved" });
  }, [state.ok, state, toast]);

  return (
    <Card>
      <CardHeader
        title="Notes"
        description="Customer notes travel on the paperwork. Internal notes never leave this screen."
      />

      {state.error ? (
        <Banner tone="danger" className="mb-4">
          {state.error}
        </Banner>
      ) : null}

      <form action={formAction} className="space-y-4">
        <Textarea
          name="notes"
          label="Customer notes"
          rows={3}
          defaultValue={booking.notes ?? ""}
          placeholder="Access instructions, where to set up…"
        />
        <Textarea
          name="internalNotes"
          label="Internal notes"
          rows={3}
          defaultValue={booking.internalNotes ?? ""}
          placeholder="Anything the crew needs to know."
        />
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
      Save notes
    </Button>
  );
}
