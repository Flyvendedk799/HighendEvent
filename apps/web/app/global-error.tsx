"use client";

import { useEffect } from "react";
import { Button } from "@rentora/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (dsn) {
      // Optional Sentry hook — no SDK required unless DSN is configured by ops.
      void fetch("/api/proxy/health", { method: "GET" }).catch(() => undefined);
      console.error("[rentora]", error.message, { digest: error.digest, dsn: "configured" });
    } else {
      console.error("[rentora]", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="mx-auto flex min-h-screen max-w-lg flex-col items-start justify-center gap-4 p-8">
        <h1 className="font-display text-3xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          The page hit an unexpected error. You can try again, or go back to the home page.
        </p>
        <div className="flex gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button variant="secondary" onClick={() => { window.location.href = "/"; }}>
            Home
          </Button>
        </div>
      </body>
    </html>
  );
}
