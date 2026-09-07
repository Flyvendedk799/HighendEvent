import { platformDomain } from "@/lib/platform";

export function StoreNotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-blueprint bg-[length:64px_64px] opacity-40"
      />
      <div className="relative max-w-md border border-line bg-ink-raised p-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-warn">
          No store at this address
        </p>
        <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.03em]">
          This store is not available
        </h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-paper-mute">
          The address you used does not point to a live store. If you own it, check that the domain
          is verified in your console and that the store is not suspended.
        </p>
        <p className="mt-6 border-t border-line-soft pt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-paper-faint">
          alarent · {platformDomain()}
        </p>
      </div>
    </div>
  );
}
