"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@rentora/ui";
import { clientApi } from "@/lib/client-api";

const NEXT: Record<string, string[]> = {
  pending: ["deposit_paid", "fully_paid", "cancelled"],
  deposit_paid: ["fully_paid", "out_for_delivery", "cancelled"],
  fully_paid: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["returned_good", "returned_damaged"],
};

export function BookingStatusActions({
  bookingId,
  statusKey,
  tenantSlug,
}: {
  bookingId: string;
  statusKey: string;
  tenantSlug: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const options = NEXT[statusKey] ?? [];

  async function transition(next: string) {
    setBusy(next);
    setError(null);
    try {
      await clientApi(`/bookings/${bookingId}/status`, {
        method: "PATCH",
        tenantSlug,
        body: JSON.stringify({ statusKey: next }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setBusy(null);
    }
  }

  if (options.length === 0) {
    return <p className="text-xs text-muted-foreground">No further transitions.</p>;
  }

  return (
    <div className="space-y-2">
      {options.map((next) => (
        <Button
          key={next}
          className="w-full"
          variant="secondary"
          disabled={busy !== null}
          onClick={() => void transition(next)}
        >
          {busy === next ? "Updating…" : `Mark ${next.replaceAll("_", " ")}`}
        </Button>
      ))}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
