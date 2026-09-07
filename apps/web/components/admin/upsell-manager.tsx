"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  Badge,
  Banner,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  ModalClose,
  Money,
  Table,
  TableContainer,
  TBody,
  Td,
  Textarea,
  Th,
  THead,
  Tr,
  useToast,
} from "@rentora/ui";
import { deleteUpsellAction, saveUpsellAction } from "@/lib/actions/catalog";
import { minorToMajor } from "@/components/admin/product-form";
import type { UpsellProduct } from "@/lib/types";

export function UpsellManager({
  upsells,
  currency,
}: {
  upsells: UpsellProduct[];
  currency: string;
}) {
  const [editing, setEditing] = useState<UpsellProduct | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating(true)}>Add add-on</Button>
      </div>

      <TableContainer>
        <Table>
          <THead>
            <Tr>
              <Th>Add-on</Th>
              <Th align="right">Price</Th>
              <Th align="right">Stock</Th>
              <Th>Status</Th>
              <Th align="right" />
            </Tr>
          </THead>
          <TBody>
            {upsells.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12">
                  <EmptyState
                    title="No add-ons yet"
                    description="Add-ons are the extras that lift booking value: setup crew, heaters, a dance floor."
                    action={<Button onClick={() => setCreating(true)}>Create an add-on</Button>}
                  />
                </td>
              </tr>
            ) : (
              upsells.map((upsell) => (
                <Tr key={upsell.id}>
                  <Td>
                    <button
                      type="button"
                      onClick={() => setEditing(upsell)}
                      className="text-left font-medium hover:underline"
                    >
                      {upsell.name}
                    </button>
                    {upsell.description ? (
                      <span className="block max-w-md truncate text-xs text-[var(--color-muted-foreground)]">
                        {upsell.description}
                      </span>
                    ) : null}
                  </Td>
                  <Td numeric>
                    <Money amountMinor={upsell.priceMinor} currency={upsell.currency ?? currency} />
                  </Td>
                  <Td numeric muted>
                    {upsell.stockQty ?? "Unlimited"}
                  </Td>
                  <Td>
                    <Badge tone={upsell.isActive ? "success" : "neutral"}>
                      {upsell.isActive ? "Offered" : "Hidden"}
                    </Badge>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(upsell)}>
                        Edit
                      </Button>
                      <DeleteUpsell upsell={upsell} />
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </TBody>
        </Table>
      </TableContainer>

      <UpsellDialog
        key={editing?.id ?? "new"}
        open={creating || editing !== null}
        upsell={editing}
        currency={currency}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </>
  );
}

function DeleteUpsell({ upsell }: { upsell: UpsellProduct }) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="ghost" className="text-red-600">
          Delete
        </Button>
      }
      title={`Delete ${upsell.name}?`}
      description="If this add-on appears on a past booking it is hidden instead, so history stays intact."
      confirmLabel="Delete add-on"
      destructive
      onConfirm={() =>
        startTransition(async () => {
          const result = await deleteUpsellAction(upsell.id);
          toast(
            result.error
              ? { title: "Could not delete", description: result.error, tone: "error" }
              : { title: "Add-on deleted" },
          );
        })
      }
    />
  );
}

function UpsellDialog({
  open,
  upsell,
  currency,
  onClose,
}: {
  open: boolean;
  upsell: UpsellProduct | null;
  currency: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const action = saveUpsellAction.bind(null, upsell?.id ?? null);
  const [state, formAction] = useActionState(action, {});

  useEffect(() => {
    if (state.ok) {
      toast({ title: upsell ? "Add-on updated" : "Add-on created" });
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok, state]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={upsell ? `Edit ${upsell.name}` : "New add-on"}
      description="Add-ons attach to products and are booked on the same dates."
    >
      <form action={formAction} className="space-y-4">
        {state.error ? <Banner tone="danger">{state.error}</Banner> : null}

        <Input
          name="name"
          label="Name"
          required
          defaultValue={upsell?.name ?? ""}
          error={state.fieldErrors?.name}
          placeholder="Setup &amp; takedown crew"
        />
        <Textarea
          name="description"
          label="Description"
          rows={3}
          defaultValue={upsell?.description ?? ""}
          hint="One line explaining what the customer gets."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            name="price"
            label="Price"
            required
            inputMode="decimal"
            suffix={currency}
            defaultValue={minorToMajor(upsell?.priceMinor)}
          />
          <Input
            name="stockQty"
            label="Stock"
            type="number"
            min={0}
            defaultValue={upsell?.stockQty ?? ""}
            hint="Blank means unlimited."
          />
        </div>
        <Input name="imageUrl" label="Image URL" defaultValue={upsell?.imageUrl ?? ""} />
        <Checkbox
          name="isActive"
          defaultChecked={upsell?.isActive ?? true}
          label="Offer this add-on"
        />

        <div className="flex justify-end gap-2 pt-2">
          <ModalClose asChild>
            <Button variant="secondary">Cancel</Button>
          </ModalClose>
          <SaveButton label={upsell ? "Save changes" : "Create add-on"} />
        </div>
      </form>
    </Modal>
  );
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}
