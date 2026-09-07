import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
          404
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">We could not find that page</h1>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
          The link may be out of date, or the item may no longer be listed.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          Go to the homepage
        </Link>
      </div>
    </div>
  );
}
