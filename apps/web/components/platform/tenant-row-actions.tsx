"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  useToast,
} from "@rentora/ui";
import { MoreHorizontal } from "lucide-react";
import {
  changeTenantPlanAction,
  suspendTenantAction,
  viewAsTenantAction,
  type PlatformTenant,
} from "@/lib/actions/platform";

const PLANS = ["STARTER", "GROWTH", "SCALE"] as const;

export function TenantRowActions({ tenant }: { tenant: PlatformTenant }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(work: () => Promise<{ error?: string }>, success: string) {
    startTransition(async () => {
      const result = await work();
      toast(
        result.error
          ? { title: "Could not complete", description: result.error, tone: "error" }
          : { title: success },
      );
    });
  }

  function viewAs() {
    startTransition(async () => {
      const result = await viewAsTenantAction(tenant.id);
      if (result.error) {
        toast({ title: "Could not open the store", description: result.error, tone: "error" });
        return;
      }
      toast({
        title: `Viewing ${tenant.name} as their owner`,
        description: "This session lasts 30 minutes and is recorded in the audit log.",
      });
      router.push("/admin");
    });
  }

  return (
    <DropdownMenu
      trigger={
        <Button variant="ghost" size="icon" aria-label={`Actions for ${tenant.name}`} disabled={pending}>
          <MoreHorizontal size={16} />
        </Button>
      }
    >
      <DropdownMenuItem asChild>
        <Link href={`/platform/tenants/${tenant.slug}`}>Open tenant</Link>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={viewAs}>View as owner</DropdownMenuItem>

      <DropdownMenuSeparator />
      <DropdownMenuLabel>Change plan</DropdownMenuLabel>
      {PLANS.filter((plan) => plan !== tenant.plan).map((plan) => (
        <DropdownMenuItem
          key={plan}
          onSelect={() =>
            run(() => changeTenantPlanAction(tenant.id, plan), `Moved to ${plan}`)
          }
        >
          Move to {plan}
        </DropdownMenuItem>
      ))}

      <DropdownMenuSeparator />
      {tenant.isSuspended ? (
        <DropdownMenuItem
          onSelect={() =>
            run(() => suspendTenantAction(tenant.id, false), `${tenant.name} reactivated`)
          }
        >
          Reactivate store
        </DropdownMenuItem>
      ) : (
        <SuspendItem tenant={tenant} />
      )}
    </DropdownMenu>
  );
}

function SuspendItem({ tenant }: { tenant: PlatformTenant }) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  return (
    <ConfirmDialog
      trigger={
        <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
          Suspend store
        </DropdownMenuItem>
      }
      title={`Suspend ${tenant.name}?`}
      description="Their storefront stops serving immediately and staff can no longer sign in. Data is untouched and you can reactivate at any time."
      confirmLabel="Suspend store"
      destructive
      onConfirm={() =>
        startTransition(async () => {
          const result = await suspendTenantAction(tenant.id, true);
          toast(
            result.error
              ? { title: "Could not suspend", description: result.error, tone: "error" }
              : { title: `${tenant.name} suspended` },
          );
        })
      }
    />
  );
}
