import type { ReactNode } from "react";
import { LiveDot } from "@rentora/ui";

/**
 * Every way into the product — staff, platform operator, customer — looks the same: one panel on
 * the blueprint ground, the lamp, and nothing else to read.
 */
export function AuthCard({
  eyebrow,
  title,
  description,
  footer,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-5 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-blueprint bg-[length:64px_64px] opacity-40"
      />
      <div className="relative w-full max-w-md">
        <div className="border border-line-raised bg-ink-raised p-7">
          <div className="flex items-center gap-2.5">
            <LiveDot />
            {eyebrow ? (
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-paper-mute">
                {eyebrow}
              </p>
            ) : null}
          </div>
          <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.03em]">{title}</h1>
          {description ? (
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-paper-mute">{description}</p>
          ) : null}
          <div className="mt-7">{children}</div>
        </div>
        {footer ? (
          <div className="mt-5 text-center text-[13px] text-paper-mute">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
