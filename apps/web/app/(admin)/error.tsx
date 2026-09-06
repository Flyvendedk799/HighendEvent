"use client";

import { useEffect } from "react";
import { Button } from "@rentora/ui";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[rentora:admin]", error);
  }, [error]);

  return (
    <main className="flex min-h-[40vh] flex-col items-start justify-center gap-4 p-6">
      <h1 className="font-display text-2xl font-semibold">Admin view error</h1>
      <p className="text-sm text-muted-foreground">
        {error.message || "Could not render this admin page."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
