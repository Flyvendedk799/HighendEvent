"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  Banner,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Table,
  TableContainer,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  useToast,
} from "@rentora/ui";
import { createBlackoutAction, deleteBlackoutAction } from "@/lib/actions/catalog";
import type { Blackout, Product } from "@/lib/types";

export function ProductAvailability({
  product,
  blackouts,
}: {
  product: Product;
  blackouts: Blackout[];
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const createAction = createBlackoutAction.bind(null, product.id);
  const [state, formAction] = useActionState(createAction, {});

  useEffect(() => {
    if (state.ok) toast({ title: "Blackout added" });
  }, [state.ok, state, toast]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Turnaround buffers"
          description="These come from the General tab and apply to every booking of this product."
        />
        <dl className="grid grid-cols-2 gap-4 text-[13.5px] sm:grid-cols-4">
          <Stat label="Units owned" value={product.stockQty} />
          <Stat label="Prep buffer" value={`${product.prepBufferDays} d`} />
          <Stat label="Cleanup buffer" value={`${product.cleanupBufferDays} d`} />
          <Stat
            label="Rental length"
            value={
              product.maxRentalDays
                ? `${product.minRentalDays}–${product.maxRentalDays} d`
                : `${product.minRentalDays}+ d`
            }
          />
        </dl>
        <p className="mt-4 font-mono text-[11px] text-paper-faint">
          A booking blocks {product.prepBufferDays} day(s) before and {product.cleanupBufferDays}{" "}
          day(s) after its dates, so the calendar never sells stock that is still in the van.
        </p>
      </Card>

      <Card>
        <CardHeader
          title="Blackout dates"
          description="Maintenance, trade shows, anything that makes this item unavailable regardless of bookings."
        />

        {state.error ? (
          <Banner tone="danger" className="mb-4">
            {state.error}
          </Banner>
        ) : null}

        <form action={formAction} className="mb-5 flex flex-wrap items-end gap-3">
          <Input name="startDate" type="date" label="From" required className="h-9" />
          <Input name="endDate" type="date" label="To" required className="h-9" />
          <div className="min-w-[180px] flex-1">
            <Input name="reason" label="Reason" placeholder="Annual service" className="h-9" />
          </div>
          <AddBlackoutButton />
        </form>

        {blackouts.length === 0 ? (
          <EmptyState
            title="No blackout dates"
            description="Add one when this item is away for repair or already committed elsewhere."
          />
        ) : (
          <TableContainer>
            <Table>
              <THead>
                <Tr>
                  <Th>From</Th>
                  <Th>To</Th>
                  <Th>Reason</Th>
                  <Th align="right" />
                </Tr>
              </THead>
              <TBody>
                {blackouts.map((blackout) => (
                  <Tr key={blackout.id}>
                    <Td numeric>{blackout.startDate.slice(0, 10)}</Td>
                    <Td numeric>{blackout.endDate.slice(0, 10)}</Td>
                    <Td muted>{blackout.reason ?? "—"}</Td>
                    <Td align="right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await deleteBlackoutAction(product.id, blackout.id);
                            toast(
                              result.error
                                ? { title: "Could not remove", description: result.error, tone: "error" }
                                : { title: "Blackout removed" },
                            );
                          })
                        }
                      >
                        Remove
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </div>
  );
}

function AddBlackoutButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" loading={pending}>
      Add blackout
    </Button>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[11px] text-paper-faint">{label}</dt>
      <dd className="mt-0.5 font-mono text-[19px] font-medium tracking-[-0.02em] tabular-nums">{value}</dd>
    </div>
  );
}
