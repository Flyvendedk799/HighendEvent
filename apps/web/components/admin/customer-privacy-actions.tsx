"use client";

import { useTransition } from "react";
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
import { deleteCustomerDataAction, exportCustomerDataAction } from "@/lib/actions/gdpr";
import type { Customer } from "@/lib/types";

/**
 * GDPR handles. Export gives the customer everything held about them; erase removes the
 * personal data while leaving the financial record, which the tenant is legally required
 * to keep.
 */
export function CustomerPrivacyActions({ customer }: { customer: Customer }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function exportData() {
    startTransition(async () => {
      const result = await exportCustomerDataAction(customer.id);
      if (result.error || !result.data) {
        toast({ title: "Export failed", description: result.error, tone: "error" });
        return;
      }

      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${customer.email.replace(/[^a-z0-9]/gi, "-")}-data.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: "Export downloaded" });
    });
  }

  return (
    <DropdownMenu
      trigger={
        <Button variant="secondary" size="icon" aria-label="Customer actions" disabled={pending}>
          <MoreHorizontal size={16} />
        </Button>
      }
    >
      <DropdownMenuLabel>Privacy</DropdownMenuLabel>
      <DropdownMenuItem onSelect={exportData}>Export their data (JSON)</DropdownMenuItem>
      <DropdownMenuSeparator />
      <EraseCustomer customer={customer} />
    </DropdownMenu>
  );
}

function EraseCustomer({ customer }: { customer: Customer }) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  return (
    <ConfirmDialog
      trigger={
        <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
          Erase personal data
        </DropdownMenuItem>
      }
      title={`Erase data for ${customer.firstName} ${customer.lastName}?`}
      description="Their name, email, phone and address are removed. Booking totals stay, because you are required to keep financial records."
      confirmLabel="Erase personal data"
      destructive
      onConfirm={() =>
        startTransition(async () => {
          const result = await deleteCustomerDataAction(customer.id);
          toast(
            result.error
              ? { title: "Could not erase", description: result.error, tone: "error" }
              : { title: "Personal data erased" },
          );
        })
      }
    />
  );
}
