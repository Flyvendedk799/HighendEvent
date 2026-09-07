"use client";

import { useState, useTransition } from "react";
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
  Select,
  Table,
  TableContainer,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  useToast,
} from "@rentora/ui";
import { deleteCouponAction, saveCouponAction, type Coupon } from "@/lib/actions/coupons";

function statusOf(coupon: Coupon): { tone: "success" | "neutral" | "warning"; label: string } {
  if (!coupon.isActive) return { tone: "neutral", label: "Off" };

  const now = new Date();
  if (coupon.startsAt && new Date(coupon.startsAt) > now) {
    return { tone: "warning", label: "Scheduled" };
  }
  if (coupon.endsAt && new Date(coupon.endsAt) < now) {
    return { tone: "neutral", label: "Expired" };
  }
  if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions) {
    return { tone: "neutral", label: "Used up" };
  }
  return { tone: "success", label: "Live" };
}

export function CouponManager({
  coupons,
  currency,
}: {
  coupons: Coupon[];
  currency: string;
}) {
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating(true)}>New code</Button>
      </div>

      <TableContainer>
        <Table>
          <THead>
            <Tr>
              <Th>Code</Th>
              <Th>Discount</Th>
              <Th>Window</Th>
              <Th align="right">Used</Th>
              <Th>Status</Th>
              <Th align="right" />
            </Tr>
          </THead>
          <TBody>
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12">
                  <EmptyState
                    title="No discount codes"
                    description="Create a code for a returning customer, a seasonal offer, or a partner deal."
                    action={<Button onClick={() => setCreating(true)}>Create a code</Button>}
                  />
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => {
                const status = statusOf(coupon);
                return (
                  <Tr key={coupon.id}>
                    <Td>
                      <button
                        type="button"
                        onClick={() => setEditing(coupon)}
                        className="font-mono font-medium hover:underline"
                      >
                        {coupon.code}
                      </button>
                    </Td>
                    <Td>
                      {coupon.percentOffBps ? (
                        `${(coupon.percentOffBps / 100).toFixed(0)}% off`
                      ) : (
                        <>
                          <Money
                            amountMinor={coupon.amountOffMinor ?? 0}
                            currency={coupon.currency ?? currency}
                          />{" "}
                          off
                        </>
                      )}
                    </Td>
                    <Td muted>
                      {coupon.startsAt || coupon.endsAt
                        ? `${coupon.startsAt?.slice(0, 10) ?? "any time"} → ${
                            coupon.endsAt?.slice(0, 10) ?? "no end"
                          }`
                        : "Always"}
                    </Td>
                    <Td numeric>
                      {coupon.redeemedCount}
                      {coupon.maxRedemptions !== null ? ` / ${coupon.maxRedemptions}` : ""}
                    </Td>
                    <Td>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </Td>
                    <Td align="right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(coupon)}>
                          Edit
                        </Button>
                        <DeleteCoupon coupon={coupon} />
                      </div>
                    </Td>
                  </Tr>
                );
              })
            )}
          </TBody>
        </Table>
      </TableContainer>

      <CouponDialog
        key={editing?.id ?? "new"}
        open={creating || editing !== null}
        coupon={editing}
        currency={currency}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </>
  );
}

function DeleteCoupon({ coupon }: { coupon: Coupon }) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="ghost" className="text-danger">
          Delete
        </Button>
      }
      title={`Delete ${coupon.code}?`}
      description={
        coupon.redeemedCount > 0
          ? "This code has been used, so it is switched off rather than deleted — the bookings that used it keep making sense."
          : "This cannot be undone."
      }
      confirmLabel="Delete code"
      destructive
      onConfirm={() =>
        startTransition(async () => {
          const result = await deleteCouponAction(coupon.id);
          toast(
            result.error
              ? { title: "Could not delete", description: result.error, tone: "error" }
              : { title: "Code removed" },
          );
        })
      }
    />
  );
}

function CouponDialog({
  open,
  coupon,
  currency,
  onClose,
}: {
  open: boolean;
  coupon: Coupon | null;
  currency: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const [code, setCode] = useState(coupon?.code ?? "");
  const [kind, setKind] = useState<"percent" | "amount">(
    coupon?.amountOffMinor ? "amount" : "percent",
  );
  const [value, setValue] = useState(
    coupon?.percentOffBps
      ? String(coupon.percentOffBps / 100)
      : coupon?.amountOffMinor
        ? String(coupon.amountOffMinor / 100)
        : "",
  );
  const [maxRedemptions, setMaxRedemptions] = useState(
    coupon?.maxRedemptions ? String(coupon.maxRedemptions) : "",
  );
  const [startsAt, setStartsAt] = useState(coupon?.startsAt?.slice(0, 10) ?? "");
  const [endsAt, setEndsAt] = useState(coupon?.endsAt?.slice(0, 10) ?? "");
  const [isActive, setIsActive] = useState(coupon?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveCouponAction({
        id: coupon?.id ?? null,
        code,
        kind,
        value,
        currency,
        maxRedemptions,
        startsAt,
        endsAt,
        isActive,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      toast({ title: coupon ? "Code updated" : "Code created" });
      onClose();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={coupon ? `Edit ${coupon.code}` : "New discount code"}
      description="Applied to the rental subtotal at checkout, before delivery and tax."
      footer={
        <>
          <ModalClose asChild>
            <Button variant="secondary">Cancel</Button>
          </ModalClose>
          <Button loading={pending} disabled={!code.trim() || !value} onClick={save}>
            {coupon ? "Save changes" : "Create code"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error ? <Banner tone="danger">{error}</Banner> : null}

        <Input
          label="Code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="font-mono"
          placeholder="SUMMER20"
          hint="What the customer types. Case does not matter."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Discount type"
            value={kind}
            onChange={(e) => setKind(e.target.value as "percent" | "amount")}
            options={[
              { value: "percent", label: "Percentage off" },
              { value: "amount", label: "Fixed amount off" },
            ]}
          />
          <Input
            label={kind === "percent" ? "Percentage" : "Amount"}
            required
            inputMode="decimal"
            suffix={kind === "percent" ? "%" : currency}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Starts"
            type="date"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
          <Input
            label="Ends"
            type="date"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
          <Input
            label="Max uses"
            type="number"
            min={1}
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(e.target.value)}
            hint="Blank for unlimited."
          />
        </div>

        <Checkbox
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          label="Accept this code"
        />
      </div>
    </Modal>
  );
}
