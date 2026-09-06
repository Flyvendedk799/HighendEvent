"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@rentora/ui";
import { clientApi } from "@/lib/client-api";
import { formatMoney } from "@/lib/money";

type PaymentEntry = {
  id: string;
  kind: string;
  label: string;
  amountMinor: number | null;
  currency: string;
  status: string;
  reference: string | null;
  at: string;
};

export function BookingOpsPanel({
  bookingId,
  tenantSlug,
  notes,
  internalNotes,
  remainingMinor,
  currency,
  statusKey,
  payments,
}: {
  bookingId: string;
  tenantSlug: string;
  notes: string | null;
  internalNotes: string | null;
  remainingMinor: number;
  currency: string;
  statusKey: string;
  payments: PaymentEntry[];
}) {
  const router = useRouter();
  const [customerNotes, setCustomerNotes] = useState(notes ?? "");
  const [staffNotes, setStaffNotes] = useState(internalNotes ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveNotes() {
    setBusy("notes");
    setError(null);
    setMessage(null);
    try {
      await clientApi(`/bookings/${bookingId}/notes`, {
        method: "PATCH",
        tenantSlug,
        body: JSON.stringify({
          notes: customerNotes,
          internalNotes: staffNotes,
        }),
      });
      setMessage("Notes saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notes");
    } finally {
      setBusy(null);
    }
  }

  async function resendEmail() {
    setBusy("resend");
    setError(null);
    setMessage(null);
    try {
      const res = await clientApi<{ emailedTo?: string }>(
        `/bookings/${bookingId}/resend-confirmation`,
        { method: "POST", tenantSlug },
      );
      setMessage(`Confirmation queued to ${res.emailedTo ?? "customer"}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend email");
    } finally {
      setBusy(null);
    }
  }

  async function downloadIcs() {
    setBusy("ics");
    setError(null);
    try {
      const res = await fetch(`/api/proxy/bookings/${bookingId}/calendar.ics`, {
        headers: { "x-tenant-slug": tenantSlug, Accept: "text/calendar" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("ICS download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${bookingId}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ICS download failed");
    } finally {
      setBusy(null);
    }
  }

  async function collectRemainder() {
    setBusy("remainder");
    setError(null);
    setMessage(null);
    try {
      const origin = window.location.origin;
      const session = await clientApi<{
        url: string;
        stub?: boolean;
        id: string;
      }>("/checkout/session", {
        method: "POST",
        tenantSlug,
        body: JSON.stringify({
          bookingId,
          paymentKind: "remainder",
          successUrl: `${origin}/admin/bookings/${bookingId}?paid=1`,
          cancelUrl: `${origin}/admin/bookings/${bookingId}`,
        }),
      });
      if (session.stub) {
        await clientApi("/checkout/complete-stub", {
          method: "POST",
          tenantSlug,
          body: JSON.stringify({ sessionId: session.id }),
        });
        setMessage("Remainder collected (stub)");
        router.refresh();
        return;
      }
      window.location.href = session.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remainder checkout failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div>
        <h3 className="mb-2 text-sm font-medium">Payments</h3>
        <ul className="space-y-2 text-sm">
          {payments.length === 0 ? (
            <li className="text-muted-foreground">No payment events yet.</li>
          ) : (
            payments.map((entry) => (
              <li
                key={entry.id}
                className="flex justify-between gap-3 border-b border-border py-2 last:border-0"
              >
                <div>
                  <p className="font-medium">{entry.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.status}
                    {entry.reference ? ` · ${entry.reference}` : ""}
                  </p>
                </div>
                <span>
                  {entry.amountMinor != null
                    ? formatMoney(entry.amountMinor, entry.currency || currency)
                    : "—"}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Customer notes
          <textarea
            className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm"
            rows={2}
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          Internal notes
          <textarea
            className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm"
            rows={2}
            value={staffNotes}
            onChange={(e) => setStaffNotes(e.target.value)}
          />
        </label>
        <Button
          variant="secondary"
          className="w-full"
          disabled={busy !== null}
          onClick={() => void saveNotes()}
        >
          {busy === "notes" ? "Saving…" : "Save notes"}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          className="w-full"
          disabled={busy !== null}
          onClick={() => void downloadIcs()}
        >
          {busy === "ics" ? "Preparing…" : "Download ICS"}
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          disabled={busy !== null}
          onClick={() => void resendEmail()}
        >
          {busy === "resend" ? "Sending…" : "Resend confirmation email"}
        </Button>
        {remainingMinor > 0 && statusKey !== "cancelled" ? (
          <Button
            className="w-full"
            disabled={busy !== null}
            onClick={() => void collectRemainder()}
          >
            {busy === "remainder"
              ? "Opening checkout…"
              : `Collect remainder (${formatMoney(remainingMinor, currency)})`}
          </Button>
        ) : null}
      </div>

      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
