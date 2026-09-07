"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  AppShell,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  type NavGroup,
} from "@rentora/ui";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Mail,
  MapPin,
  Megaphone,
  Package,
  Palette,
  Rocket,
  Settings,
  Tags,
  Truck,
  UserRound,
  Users,
} from "lucide-react";

const iconProps = { size: 15, strokeWidth: 1.75 } as const;

const NAV: NavGroup[] = [
  {
    items: [
      { href: "/admin", label: "Overview", icon: <LayoutDashboard {...iconProps} /> },
      { href: "/admin/bookings", label: "Bookings", icon: <ClipboardList {...iconProps} /> },
      { href: "/admin/calendar", label: "Calendar", icon: <CalendarDays {...iconProps} /> },
      { href: "/admin/customers", label: "Customers", icon: <Users {...iconProps} /> },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: <Package {...iconProps} /> },
      { href: "/admin/categories", label: "Categories", icon: <Tags {...iconProps} /> },
      { href: "/admin/upsells", label: "Upsells", icon: <Boxes {...iconProps} /> },
      { href: "/admin/media", label: "Media", icon: <ImageIcon {...iconProps} /> },
    ],
  },
  {
    label: "Storefront",
    items: [
      { href: "/admin/theme", label: "Theme", icon: <Palette {...iconProps} /> },
      { href: "/admin/cms", label: "Pages", icon: <FileText {...iconProps} /> },
      { href: "/admin/emails", label: "Emails", icon: <Mail {...iconProps} /> },
      { href: "/admin/newsletter", label: "Newsletter", icon: <Megaphone {...iconProps} /> },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/delivery", label: "Delivery", icon: <Truck {...iconProps} /> },
      { href: "/admin/locations", label: "Locations", icon: <MapPin {...iconProps} /> },
      { href: "/admin/analytics", label: "Analytics", icon: <BarChart3 {...iconProps} /> },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/admin/staff", label: "Staff", icon: <UserRound {...iconProps} /> },
      { href: "/admin/settings", label: "Settings", icon: <Settings {...iconProps} /> },
      { href: "/admin/go-live", label: "Go live", icon: <Rocket {...iconProps} /> },
    ],
  },
];

export type AdminShellProps = {
  storeName: string;
  userName: string;
  userEmail: string;
  staffRole: string;
  /** Count of bookings that need attention today; hidden when zero. */
  attentionCount?: number;
  logout: () => Promise<void>;
  children: ReactNode;
};

export function AdminShell({
  storeName,
  userName,
  userEmail,
  staffRole,
  attentionCount,
  logout,
  children,
}: AdminShellProps) {
  const pathname = usePathname() ?? "/admin";

  const groups: NavGroup[] = NAV.map((group) => ({
    ...group,
    items: group.items.map((item) =>
      item.href === "/admin/bookings" && attentionCount
        ? { ...item, badge: attentionCount }
        : item,
    ),
  }));

  return (
    <AppShell
      activePath={pathname}
      groups={groups}
      renderLink={({ href, className, children }) => (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
      brand={
        <div>
          <p className="truncate text-sm font-semibold text-white">{storeName}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Rentora admin</p>
        </div>
      }
      footer={
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <CreditCard size={15} strokeWidth={1.75} />
          View storefront
        </Link>
      }
      topbar={
        <div className="flex items-center justify-end gap-2">
          <DropdownMenu
            trigger={
              <Button variant="ghost" size="sm" className="gap-2">
                <span className="hidden text-[13px] sm:inline">{userName}</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)] text-[11px] font-semibold text-white">
                  {initialsOf(userName || userEmail)}
                </span>
              </Button>
            }
          >
            <DropdownMenuLabel>
              <span className="block truncate font-normal text-[var(--color-foreground)]">
                {userEmail}
              </span>
              <Badge tone="neutral" className="mt-1">
                {staffRole}
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/settings">Store settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/staff">Staff</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => void logout()}>
              Log out
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}

function initialsOf(value: string): string {
  const parts = value.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase();
}
