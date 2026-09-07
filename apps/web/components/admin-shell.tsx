"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  AppShell,
  Button,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  ShellBrand,
  ShellStatus,
  type NavGroup,
} from "@rentora/ui";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  ClipboardList,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Mail,
  MapPin,
  Megaphone,
  Package,
  Palette,
  Percent,
  Rocket,
  Settings,
  Store,
  Tags,
  Truck,
  UserRound,
  Users,
} from "lucide-react";

const iconProps = { size: 14, strokeWidth: 1.75 } as const;

/*
 * The console is ordered by the day, not by the data model: what the crew touches this morning
 * sits above what an owner edits once a quarter.
 */
const NAV: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { href: "/admin", label: "Today", icon: <LayoutDashboard {...iconProps} /> },
      { href: "/admin/bookings", label: "Bookings", icon: <ClipboardList {...iconProps} /> },
      { href: "/admin/calendar", label: "Board", icon: <CalendarDays {...iconProps} /> },
      { href: "/admin/customers", label: "Customers", icon: <Users {...iconProps} /> },
      { href: "/admin/delivery", label: "Delivery", icon: <Truck {...iconProps} /> },
      { href: "/admin/locations", label: "Locations", icon: <MapPin {...iconProps} /> },
    ],
  },
  {
    label: "Fleet",
    items: [
      { href: "/admin/products", label: "Products", icon: <Package {...iconProps} /> },
      { href: "/admin/categories", label: "Categories", icon: <Tags {...iconProps} /> },
      { href: "/admin/upsells", label: "Add-ons", icon: <Boxes {...iconProps} /> },
      { href: "/admin/coupons", label: "Discount codes", icon: <Percent {...iconProps} /> },
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
    label: "Account",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: <BarChart3 {...iconProps} /> },
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
  /** Sidebar lamps — either the shop can take money and be found, or it cannot. */
  payoutsReady?: boolean;
  primaryDomain?: string | null;
  logout: () => Promise<void>;
  children: ReactNode;
};

export function AdminShell({
  storeName,
  userName,
  userEmail,
  staffRole,
  attentionCount,
  payoutsReady,
  primaryDomain,
  logout,
  children,
}: AdminShellProps) {
  const pathname = usePathname() ?? "/admin";

  const renderLink = ({
    href,
    className,
    children: linkChildren,
  }: {
    href: string;
    className: string;
    children: ReactNode;
  }) => (
    <Link href={href} className={className}>
      {linkChildren}
    </Link>
  );

  const groups: NavGroup[] = NAV.map((group) => ({
    ...group,
    items: group.items.map((item) =>
      item.href === "/admin/bookings" && attentionCount
        ? { ...item, badge: attentionCount, badgeTone: "warn" as const }
        : item,
    ),
  }));

  return (
    <AppShell
      activePath={pathname}
      groups={groups}
      renderLink={renderLink}
      brand={
        <ShellBrand name={storeName} context="alarent console" href="/admin" renderLink={renderLink} />
      }
      footer={
        <>
          <ShellStatus
            items={[
              {
                label: "Payouts",
                value: payoutsReady ? "Ready" : "Not connected",
                tone: payoutsReady ? "ok" : "warn",
              },
              {
                label: "Domain",
                value: primaryDomain ? "Live" : "Default",
                tone: primaryDomain ? "ok" : "quiet",
              },
            ]}
          />
          <Link
            href="/"
            className="flex items-center gap-2.5 border-t border-line px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-paper-mute transition-colors duration-instant hover:text-signal"
          >
            <Store size={13} strokeWidth={1.75} />
            View storefront
          </Link>
        </>
      }
      topbar={
        <div className="flex items-center justify-end gap-2">
          <DropdownMenu
            trigger={
              <Button variant="ghost" size="sm" className="gap-2.5">
                <span className="hidden normal-case tracking-normal sm:inline">{userName}</span>
                <span className="flex h-6 w-6 items-center justify-center bg-signal text-[10px] font-semibold text-signal-ink">
                  {initialsOf(userName || userEmail)}
                </span>
              </Button>
            }
          >
            <DropdownMenuLabel>
              <span className="block truncate font-mono text-[11px] text-paper">{userEmail}</span>
              <span className="mt-1 block font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper-faint">
                {staffRole}
              </span>
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
