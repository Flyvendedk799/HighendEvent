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
    <div className="flex min-h-[60vh] items-center justify-center px-5">
      <div className="max-w-md border border-line bg-ink-raised p-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-danger">Error</p>
        <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.03em]">Something went wrong</h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-paper-mute">
          The page could not be loaded. Trying again often works; if it does not, the reference
          below will help us find it.
        </p>
        {error.digest ? (
          <p className="mt-4 border border-line-soft bg-ink-sunk px-3 py-2 font-mono text-[11px] text-paper-faint">
            {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-6 bg-signal px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-signal-ink transition-colors duration-instant hover:bg-signal-press"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
