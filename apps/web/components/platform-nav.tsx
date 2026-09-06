import Link from "next/link";
import { cx } from "@rentora/ui";

const items = [
  { href: "/platform", label: "Overview" },
  { href: "/platform/tenants", label: "Tenants" },
  { href: "/platform/plans", label: "Plans & billing" },
  { href: "/platform/feature-flags", label: "Feature flags" },
];

export function PlatformNav({ activePath }: { activePath?: string }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div>
          <Link href="/platform" className="font-display text-xl font-semibold text-foreground">
            Rentora Platform
          </Link>
          <p className="text-xs text-muted-foreground">Multi-tenant control plane</p>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm">
          {items.map((item) => {
            const active =
              activePath === item.href ||
              (item.href !== "/platform" && activePath?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "rounded-lg px-3 py-1.5 transition",
                  active
                    ? "bg-teal-700 text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
