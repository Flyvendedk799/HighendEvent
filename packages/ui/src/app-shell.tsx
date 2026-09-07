"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cx, focusRing, monoLabel } from "./utils";

export type NavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  /** Rendered right-aligned — a count of things needing attention, never decoration. */
  badge?: ReactNode;
  /** Amber or red pulls a queue forward: something in it is costing money or is late. */
  badgeTone?: "default" | "warn" | "danger" | "signal";
};

export type NavGroup = { label?: string; items: NavItem[] };

export type AppShellProps = {
  brand: ReactNode;
  groups: NavGroup[];
  activePath: string;
  footer?: ReactNode;
  topbar?: ReactNode;
  children: ReactNode;
  /** Link renderer — lets the host app pass next/link without the UI package depending on Next. */
  renderLink: (props: { href: string; className: string; children: ReactNode }) => ReactNode;
};

function isActive(activePath: string, href: string): boolean {
  if (href === activePath) return true;
  // "/admin" must not light up for "/admin/products"; deeper routes must light up their parent.
  const segments = href.split("/").filter(Boolean);
  if (segments.length <= 1) return false;
  return activePath.startsWith(`${href}/`);
}

const badgeTones = {
  default: "text-paper-ghost",
  signal: "text-signal",
  warn: "text-warn",
  danger: "text-danger",
} as const;

export function AppShell({
  brand,
  groups,
  activePath,
  footer,
  topbar,
  children,
  renderLink,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Navigating inside the drawer must close it, or the next screen renders behind the sheet.
  useEffect(() => {
    setMobileOpen(false);
  }, [activePath]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const nav = (
    <nav className="flex-1 overflow-y-auto pb-4">
      {groups.map((group, i) => (
        <div key={group.label ?? i}>
          {group.label ? (
            <p className={cx("px-4 pb-2 pt-5 text-[9px] text-paper-ghost", monoLabel)}>
              {group.label}
            </p>
          ) : (
            <div className="pt-3" />
          )}
          <ul>
            {group.items.map((item) => {
              const active = isActive(activePath, item.href);
              return (
                <li key={item.href}>
                  {renderLink({
                    href: item.href,
                    className: cx(
                      "flex items-center gap-2.5 border-l-2 px-4 py-2 text-[13px] transition-colors duration-instant",
                      focusRing,
                      active
                        ? "border-signal bg-ink-hover text-paper"
                        : "border-transparent text-paper-dim hover:bg-ink-hover hover:text-paper",
                    ),
                    children: (
                      <>
                        {item.icon ? (
                          <span className={cx("shrink-0", active ? "text-signal" : "text-paper-faint")}>
                            {item.icon}
                          </span>
                        ) : null}
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.badge ? (
                          <span
                            className={cx(
                              "shrink-0 font-mono text-[10px] tabular-nums",
                              badgeTones[item.badgeTone ?? "default"],
                            )}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </>
                    ),
                  })}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const sidebar = (
    <div className="flex h-full flex-col border-r border-line bg-ink">
      <div className="border-b border-line">{brand}</div>
      {nav}
      {footer ? <div className="mt-auto border-t border-line">{footer}</div> : null}
    </div>
  );

  return (
    <div className="alarent-console flex min-h-screen bg-ink-sunk">
      <aside className="hidden w-52 shrink-0 md:block">
        <div className="fixed inset-y-0 w-52">{sidebar}</div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-ink/80 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-60 shadow-panel">{sidebar}</div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-40 flex min-h-[52px] items-center gap-3 border-b border-line bg-ink-sunk/85 px-4 py-2.5 backdrop-blur-md md:px-5">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className={cx(
              "-ml-1 p-1.5 text-paper-dim transition-colors duration-instant hover:text-signal md:hidden",
              focusRing,
            )}
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">{topbar}</div>
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

/**
 * The sidebar brand block: a blinking lamp, the wordmark, and what this console belongs to.
 * The lamp is the same one the occupancy board uses — it means "this is live data".
 */
export function ShellBrand({
  name,
  context,
  href = "/",
  renderLink,
}: {
  name: string;
  context?: string;
  href?: string;
  renderLink: (props: { href: string; className: string; children: ReactNode }) => ReactNode;
}) {
  return renderLink({
    href,
    className: cx("flex items-center gap-2.5 px-4 py-3.5", focusRing),
    children: (
      <>
        <span aria-hidden="true" className="h-[7px] w-[7px] shrink-0 bg-signal animate-blink" />
        <span className="min-w-0">
          <span className="block truncate font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-paper">
            {name}
          </span>
          {context ? (
            <span className="mt-0.5 block truncate font-mono text-[9px] uppercase tracking-[0.16em] text-paper-faint">
              {context}
            </span>
          ) : null}
        </span>
      </>
    ),
  });
}

/**
 * Sidebar footer readouts — payouts, domain, anything that is either ready or is not. Two words,
 * one colour, no link: it is a lamp, and the page that fixes it is in the nav above.
 */
export function ShellStatus({
  items,
}: {
  items: Array<{ label: string; value: string; tone?: "ok" | "warn" | "danger" | "quiet" }>;
}) {
  const tones = {
    ok: "text-signal",
    warn: "text-warn",
    danger: "text-danger",
    quiet: "text-paper-faint",
  } as const;

  return (
    <dl className="space-y-1.5 px-4 py-3.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-3">
          <dt className={cx("text-[9px] text-paper-faint", monoLabel)}>{item.label}</dt>
          <dd
            className={cx(
              "text-[9px] font-medium",
              monoLabel,
              tones[item.tone ?? "quiet"],
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
