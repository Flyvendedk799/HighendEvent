"use client";

import { useEffect } from "react";
import { Button } from "@rentora/ui";

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[rentora:storefront]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-start justify-center gap-4 p-8">
      <h1 className="font-display text-2xl font-semibold">Storefront error</h1>
      <p className="text-sm text-muted-foreground">
        {error.message || "Could not render this page."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
