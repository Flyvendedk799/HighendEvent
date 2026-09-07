"use client";

import { useTransition } from "react";
import {
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  useToast,
} from "@rentora/ui";
import { MoreHorizontal } from "lucide-react";
import {
  deleteProductAction,
  duplicateProductAction,
  setProductActiveAction,
} from "@/lib/actions/catalog";
import type { Product } from "@/lib/types";

export function ProductActions({ product }: { product: Product }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function run(work: () => Promise<{ error?: string }>, successMessage: string) {
    startTransition(async () => {
      const result = await work();
      toast(
        result?.error
          ? { title: "Could not complete", description: result.error, tone: "error" }
          : { title: successMessage },
      );
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          run(
            () => setProductActiveAction(product.id, !product.isActive),
            product.isActive ? "Product archived" : "Product published",
          )
        }
      >
        {product.isActive ? "Archive" : "Publish"}
      </Button>

      <DropdownMenu
        trigger={
          <Button variant="secondary" size="icon" aria-label="More actions" disabled={pending}>
            <MoreHorizontal size={16} />
          </Button>
        }
      >
        <DropdownMenuItem
          onSelect={() => run(() => duplicateProductAction(product.id), "Product duplicated")}
        >
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DeleteItem product={product} />
      </DropdownMenu>
    </div>
  );
}

function DeleteItem({ product }: { product: Product }) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  return (
    <ConfirmDialog
      trigger={
        <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
          Delete
        </DropdownMenuItem>
      }
      title={`Delete ${product.name}?`}
      description="If this product appears on any booking it is archived instead, so your booking history stays intact."
      confirmLabel="Delete product"
      destructive
      onConfirm={() =>
        startTransition(async () => {
          const result = await deleteProductAction(product.id);
          if (result?.error) {
            toast({ title: "Could not delete", description: result.error, tone: "error" });
          }
        })
      }
    />
  );
}
