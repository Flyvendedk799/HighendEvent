import type { ReactNode } from "react";

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
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-7 shadow-sm">
          {eyebrow ? (
            <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">{description}</p>
          ) : null}
          <div className="mt-6">{children}</div>
        </div>
        {footer ? (
          <div className="mt-4 text-center text-sm text-[var(--color-muted-foreground)]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
