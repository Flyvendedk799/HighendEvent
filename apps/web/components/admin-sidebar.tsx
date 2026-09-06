import Link from "next/link";
import { cx } from "@rentora/ui";
import { getDictionary } from "@/lib/i18n";

const items = [
  { href: "/admin", key: "overview" as const },
  { href: "/admin/products", key: "products" as const },
  { href: "/admin/categories", key: "categories" as const },
  { href: "/admin/upsells", key: "upsells" as const },
  { href: "/admin/bookings", key: "bookings" as const },
  { href: "/admin/customers", key: "customers" as const },
  { href: "/admin/calendar", key: "calendar" as const },
  { href: "/admin/locations", key: "locations" as const },
  { href: "/admin/delivery", key: "delivery" as const },
  { href: "/admin/cms", key: "cms" as const },
  { href: "/admin/theme", key: "theme" as const },
  { href: "/admin/media", key: "media" as const },
  { href: "/admin/analytics", key: "analytics" as const },
  { href: "/admin/coupons", key: "coupons" as const },
  { href: "/admin/settings", key: "settings" as const },
  { href: "/admin/emails", key: "emails" as const },
  { href: "/admin/newsletter", key: "newsletter" as const },
  { href: "/admin/staff", key: "staff" as const },
  { href: "/admin/developer", key: "developer" as const },
  { href: "/admin/go-live", key: "goLive" as const },
];

export function AdminSidebar({ activePath }: { activePath?: string }) {
  const t = getDictionary("en").admin;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-slate-950 text-slate-100">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/admin" className="font-display text-lg font-semibold tracking-tight">
          Rentora Admin
        </Link>
        <p className="mt-1 text-xs text-slate-400">Tenant console</p>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 text-sm">
        {items.map((item) => {
          const active =
            activePath === item.href ||
            (item.href !== "/admin" && activePath?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "block rounded-lg px-3 py-2 transition",
                active ? "bg-teal-600 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
              )}
            >
              {t[item.key]}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4 text-xs text-slate-400">
        <Link href="/home" className="hover:text-white">
          ← View storefront
        </Link>
      </div>
    </aside>
  );
}
