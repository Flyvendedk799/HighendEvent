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
  type NavGroup,
} from "@rentora/ui";
import { Building2, CreditCard, Flag, LayoutDashboard } from "lucide-react";

const iconProps = { size: 15, strokeWidth: 1.75 } as const;

const NAV: NavGroup[] = [
  {
    items: [
      { href: "/platform", label: "Overview", icon: <LayoutDashboard {...iconProps} /> },
      { href: "/platform/tenants", label: "Tenants", icon: <Building2 {...iconProps} /> },
      { href: "/platform/plans", label: "Plans & billing", icon: <CreditCard {...iconProps} /> },
      { href: "/platform/feature-flags", label: "Feature flags", icon: <Flag {...iconProps} /> },
    ],
  },
];

export function PlatformShell({
  userEmail,
  logout,
  children,
}: {
  userEmail: string;
  logout: () => Promise<void>;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/platform";

  return (
    <AppShell
      activePath={pathname}
      groups={NAV}
      renderLink={({ href, className, children }) => (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
      brand={
        <div>
          <p className="text-sm font-semibold text-white">Rentora</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Control plane</p>
        </div>
      }
      topbar={
        <div className="flex items-center justify-end">
          <DropdownMenu
            trigger={
              <Button variant="ghost" size="sm">
                {userEmail}
              </Button>
            }
          >
            <DropdownMenuLabel>Signed in as operator</DropdownMenuLabel>
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
