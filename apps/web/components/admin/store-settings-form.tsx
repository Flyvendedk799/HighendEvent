"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Banner,
  Button,
  Card,
  CardHeader,
  Input,
  Select,
  Textarea,
  useToast,
} from "@rentora/ui";
import { updateStoreSettingsAction, type StoreSettings } from "@/lib/actions/store";

const CURRENCIES = ["DKK", "EUR", "GBP", "USD", "SEK", "NOK", "PLN"];

export function StoreSettingsForm({ store }: { store: StoreSettings }) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(updateStoreSettingsAction, {});
  const [paymentModel, setPaymentModel] = useState(store.paymentModel);

  useEffect(() => {
    if (state.ok) toast({ title: "Settings saved" });
  }, [state.ok, state, toast]);

  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? <Banner tone="danger">{state.error}</Banner> : null}

      <Card>
        <CardHeader title="Store" description="How your business appears to customers." />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              name="name"
              label="Store name"
              required
              defaultValue={store.name}
              error={err.name}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              name="tagline"
              label="Tagline"
              defaultValue={store.tagline ?? ""}
              hint="One line under your name on the homepage."
            />
          </div>
          <Input
            name="supportEmail"
            type="email"
            label="Contact email"
            defaultValue={store.supportEmail ?? ""}
            hint="Shown in the footer and used as the reply-to on emails."
          />
          <Input
            name="supportPhone"
            type="tel"
            label="Contact phone"
            defaultValue={store.supportPhone ?? ""}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Money"
          description="Currency and tax apply to every price in your catalog."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            name="currency"
            label="Currency"
            defaultValue={store.currency}
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
          />
          <Input
            name="country"
            label="Country code"
            defaultValue={store.country}
            maxLength={2}
            hint="Two letters, e.g. DK."
          />
          <Select
            name="taxMode"
            label="Tax handling"
            defaultValue={store.taxMode}
            options={[
              { value: "INCLUSIVE", label: "Prices include tax" },
              { value: "EXCLUSIVE", label: "Tax added at checkout" },
            ]}
          />
          <Input
            name="taxPercent"
            label="Tax rate"
            inputMode="decimal"
            suffix="%"
            defaultValue={(store.taxPercentBps / 100).toString()}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Payment"
          description="Whether customers pay in full up front, or a deposit now and the balance before their dates."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            name="paymentModel"
            label="Payment model"
            value={paymentModel}
            onChange={(e) => setPaymentModel(e.target.value as StoreSettings["paymentModel"])}
            options={[
              { value: "FULL_UPFRONT", label: "Pay in full at checkout" },
              { value: "DEPOSIT_REMAINDER", label: "Deposit now, balance later" },
            ]}
          />
          <Input
            name="depositPercent"
            label="Deposit"
            inputMode="decimal"
            suffix="%"
            defaultValue={(store.depositPercentBps / 100).toString()}
            disabled={paymentModel !== "DEPOSIT_REMAINDER"}
            hint={
              paymentModel === "DEPOSIT_REMAINDER"
                ? "Charged at checkout; the rest is collected before delivery."
                : "Only used with deposit and balance."
            }
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Language and time" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            name="localeDefault"
            label="Default language"
            defaultValue={store.localeDefault}
            options={[
              { value: "en", label: "English" },
              { value: "da", label: "Dansk" },
            ]}
          />
          <Input
            name="timezone"
            label="Timezone"
            defaultValue={store.timezone}
            hint="IANA name, e.g. Europe/Copenhagen."
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Search engines"
          description="How your storefront appears in search results and when shared."
        />
        <div className="space-y-4">
          <Input
            name="seoTitle"
            label="Title"
            defaultValue={store.seoTitle ?? ""}
            maxLength={70}
            hint="Around 60 characters reads best."
          />
          <Textarea
            name="seoDescription"
            label="Description"
            rows={2}
            defaultValue={store.seoDescription ?? ""}
            maxLength={180}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <SaveButton />
      </div>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Save settings
    </Button>
  );
}
