"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Banner, Button, Input, Modal, ModalClose, useToast } from "@rentora/ui";
import { rescheduleBookingAction } from "@/lib/actions/bookings";
import type { Booking } from "@/lib/types";

export function BookingSchedule({ booking }: { booking: Booking }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const action = rescheduleBookingAction.bind(null, booking.id);
  const [state, formAction] = useActionState(action, {});

  useEffect(() => {
    if (state.ok) {
      toast({ title: "Booking rescheduled" });
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok, state]);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Reschedule
      </Button>
      <p className="font-mono text-[11px] text-paper-faint">
        Availability is re-checked against every other booking before the change is saved.
      </p>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={`Reschedule ${booking.bookingNo}`}
        description="The new dates must be free for every item on this booking."
      >
        <form action={formAction} className="space-y-4">
          {state.error ? <Banner tone="danger">{state.error}</Banner> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="startDate"
              type="date"
              label="From"
              required
              defaultValue={booking.startDate.slice(0, 10)}
            />
            <Input
              name="endDate"
              type="date"
              label="To"
              required
              defaultValue={booking.endDate.slice(0, 10)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <ModalClose asChild>
              <Button variant="secondary">Cancel</Button>
            </ModalClose>
            <SaveButton />
          </div>
        </form>
      </Modal>
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Move booking
    </Button>
  );
}
