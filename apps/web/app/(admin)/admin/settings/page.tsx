"use client";

import { Button, Card, Input } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

export default function AdminSettingsPage() {
  return (
    <main>
      <PageHeader title="Settings" description="Store identity, tax, and payment model." />
      <form className="grid max-w-3xl gap-6">
        <Card className="grid gap-4 sm:grid-cols-2">
          <Input name="storeName" label="Store name" defaultValue="Demo Rentals" />
          <Input name="supportEmail" label="Support email" defaultValue="hello@demo.rentora.app" />
          <Input name="currency" label="Currency" defaultValue="DKK" />
          <Input name="timezone" label="Timezone" defaultValue="Europe/Copenhagen" />
          <Input name="tax" label="VAT %" defaultValue="25" />
          <Input name="deposit" label="Deposit %" defaultValue="30" />
        </Card>
        <Button className="w-fit">Save settings</Button>
      </form>
    </main>
  );
}
