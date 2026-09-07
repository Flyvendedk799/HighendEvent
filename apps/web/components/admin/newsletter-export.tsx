"use client";

import { Button, useToast } from "@rentora/ui";
import type { NewsletterSubscription } from "@/lib/actions/operations";

/**
 * Exports the subscriber list as CSV. Rentora does not send campaigns itself, so the honest
 * thing is to hand the tenant their list for the tool they already use.
 */
export function NewsletterExport({
  subscribers,
}: {
  subscribers: NewsletterSubscription[];
}) {
  const { toast } = useToast();

  function download() {
    if (subscribers.length === 0) {
      toast({ title: "Nothing to export yet", tone: "error" });
      return;
    }

    const rows = [
      ["email", "subscribed_at"],
      ...subscribers.map((s) => [s.email, new Date(s.createdAt).toISOString()]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: `Exported ${subscribers.length} subscriber(s)` });
  }

  return (
    <Button variant="secondary" onClick={download}>
      Export CSV
    </Button>
  );
}
