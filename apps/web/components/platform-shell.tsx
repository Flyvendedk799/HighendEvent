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
  type NavGroup,
} from "@rentora/ui";
import { Building2, CreditCard, Flag, LayoutDashboard } from "lucide-react";

const iconProps = { size: 14, strokeWidth: 1.75 } as const;

const NAV: NavGroup[] = [
  {
    label: "Control plane",
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

  return (
    <AppShell
      activePath={pathname}
      groups={NAV}
      renderLink={renderLink}
      brand={
        <ShellBrand
          name="alarent"
          context="control plane"
          href="/platform"
          renderLink={renderLink}
        />
      }
      topbar={
        <div className="flex items-center justify-end">
          <DropdownMenu
            trigger={
              <Button variant="ghost" size="sm" className="normal-case tracking-normal">
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
