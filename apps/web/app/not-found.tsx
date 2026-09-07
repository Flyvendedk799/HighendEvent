import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5">
      <div className="max-w-md border border-line bg-ink-raised p-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper-mute">404</p>
        <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.03em]">
          We could not find that page
        </h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-paper-mute">
          The link may be out of date, or the item may no longer be listed.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block bg-signal px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-signal-ink transition-colors duration-instant hover:bg-signal-press"
        >
          Go to the homepage
        </Link>
      </div>
    </div>
  );
}
