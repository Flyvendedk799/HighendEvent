"use client";

import { useState, type ReactNode } from "react";
import { cx, focusRing } from "./utils";

export type NavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  /** Rendered right-aligned — a count of things needing attention, never decoration. */
  badge?: ReactNode;
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

  const nav = (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {groups.map((group, i) => (
        <div key={group.label ?? i}>
          {group.label ? (
            <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {group.label}
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(activePath, item.href);
              return (
                <li key={item.href}>
                  {renderLink({
                    href: item.href,
                    className: cx(
                      "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                      focusRing,
                      active
                        ? "bg-white/10 font-medium text-white"
                        : "text-slate-300 hover:bg-white/5 hover:text-white",
                    ),
                    children: (
                      <>
                        {active ? (
                          <span
                            aria-hidden="true"
                            className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-teal-400"
                          />
                        ) : null}
                        {item.icon ? (
                          <span className="shrink-0 opacity-80">{item.icon}</span>
                        ) : null}
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.badge ? (
                          <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[11px] tabular-nums text-slate-200">
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
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      <div className="border-b border-white/10 px-5 py-4">{brand}</div>
      {nav}
      {footer ? <div className="border-t border-white/10 p-3">{footer}</div> : null}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[var(--color-background,#f6f7f9)]">
      <aside className="hidden w-60 shrink-0 md:block">
        <div className="fixed inset-y-0 w-60">{sidebar}</div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64" onClick={() => setMobileOpen(false)}>
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-[var(--color-border,#e2e8f0)] bg-[var(--color-surface,#fff)]/85 px-4 backdrop-blur md:px-6">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className={cx("rounded-md p-1.5 text-slate-600 hover:bg-slate-100 md:hidden", focusRing)}
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">{topbar}</div>
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
