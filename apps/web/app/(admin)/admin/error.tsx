"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Banner, Button } from "@rentora/ui";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <Banner tone="danger" title="This screen could not load">
        {/* The API is a separate deploy target, so an unreachable API is the likeliest cause. */}
        alarent could not reach its API, or the API returned an error. Your data is untouched.
        {error.digest ? (
          <span className="mt-2 block font-mono text-[11.5px]">{error.digest}</span>
        ) : null}
      </Banner>

      <div className="mt-5 flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="secondary" asChild>
          <Link href="/admin">Back to the overview</Link>
        </Button>
      </div>
    </div>
  );
}
