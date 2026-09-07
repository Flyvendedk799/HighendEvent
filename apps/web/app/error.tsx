"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary. Anything that reaches here is a bug, so it is logged with its digest —
 * the one identifier that ties what the user saw to the server log entry.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
          The page could not be loaded. Trying again often works; if it does not, the reference
          below will help us find it.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-[var(--color-muted-foreground)]">
            {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
