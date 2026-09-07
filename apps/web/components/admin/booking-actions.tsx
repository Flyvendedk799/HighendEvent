"use client";

import { useState, useTransition } from "react";
import {
  Banner,
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Modal,
  ModalClose,
  Money,
  useToast,
} from "@rentora/ui";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import {
  collectRemainderAction,
  deleteBookingAction,
  restoreBookingAction,
  transitionBookingAction,
} from "@/lib/actions/bookings";
import { statusLabel } from "@rentora/ui";
import type { Booking } from "@/lib/types";

export function BookingActions({
  booking,
  transitions,
}: {
  booking: Booking;
  transitions: Array<{ key: string; label: string }>;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [remainderUrl, setRemainderUrl] = useState<string | null>(null);
  const [remainderNote, setRemainderNote] = useState<string | null>(null);

  function run(work: () => Promise<{ error?: string }>, successMessage: string) {
    startTransition(async () => {
      const result = await work();
      toast(
        result?.error
          ? { title: "Could not complete", description: result.error, tone: "error" }
          : { title: successMessage },
      );
    });
  }

  function collectRemainder() {
    startTransition(async () => {
      const result = await collectRemainderAction(booking.id);
      if (result.error) {
        toast({ title: "Could not create a payment link", description: result.error, tone: "error" });
        return;
      }
      setRemainderUrl(result.url ?? null);
      setRemainderNote(result.message ?? null);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {booking.remainingMinor > 0 && !booking.isDeleted ? (
        <Button variant="secondary" disabled={pending} onClick={collectRemainder}>
          Collect{" "}
          <Money amountMinor={booking.remainingMinor} currency={booking.currency} />
        </Button>
      ) : null}

      {transitions.length > 0 && !booking.isDeleted ? (
        <DropdownMenu
          trigger={
            <Button disabled={pending}>
              Change status
              <ChevronDown size={15} />
            </Button>
          }
        >
          <DropdownMenuLabel>
            Currently {statusLabel(booking.statusKey)}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {transitions.map((transition) => (
            <DropdownMenuItem
              key={transition.key}
              destructive={transition.key === "cancelled"}
              onSelect={() =>
                run(
                  () => transitionBookingAction(booking.id, transition.key),
                  `Marked ${transition.label.toLowerCase()}`,
                )
              }
            >
              {transition.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenu>
      ) : null}

      <DropdownMenu
        trigger={
          <Button variant="secondary" size="icon" aria-label="More actions" disabled={pending}>
            <MoreHorizontal size={16} />
          </Button>
        }
      >
        <DropdownMenuItem asChild>
          <a href={`/api/bookings.ics`}>Download calendar</a>
        </DropdownMenuItem>
        {booking.isDeleted ? (
          <DropdownMenuItem
            onSelect={() => run(() => restoreBookingAction(booking.id), "Booking restored")}
          >
            Restore booking
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuSeparator />
            <DeleteBooking booking={booking} />
          </>
        )}
      </DropdownMenu>

      <Modal
        open={remainderUrl !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRemainderUrl(null);
            setRemainderNote(null);
          }
        }}
        title="Payment link ready"
        description="Send this to the customer to settle the balance."
        footer={
          <ModalClose asChild>
            <Button variant="secondary">Close</Button>
          </ModalClose>
        }
      >
        {remainderNote ? (
          <Banner tone="info" className="mb-3">
            {remainderNote}
          </Banner>
        ) : null}
        <input
          readOnly
          value={remainderUrl ?? ""}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-sm"
        />
        <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
          Once paid, this booking moves to fully paid automatically.
        </p>
      </Modal>
    </div>
  );
}

function DeleteBooking({ booking }: { booking: Booking }) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  return (
    <ConfirmDialog
      trigger={
        <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
          Delete booking
        </DropdownMenuItem>
      }
      title={`Delete ${booking.bookingNo}?`}
      description="The booking is kept for your records but stops holding stock, and can be restored."
      confirmLabel="Delete booking"
      destructive
      onConfirm={() =>
        startTransition(async () => {
          const result = await deleteBookingAction(booking.id);
          if (result?.error) {
            toast({ title: "Could not delete", description: result.error, tone: "error" });
          }
        })
      }
    />
  );
}
