"use client";

import { Button, Card, Input } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

export default function AdminDeliveryPage() {
  return (
    <main>
      <PageHeader
        title="Delivery"
        description="Base fees, distance bands, and blackout windows."
      />
      <div className="grid max-w-3xl gap-6">
        <Card className="grid gap-4 sm:grid-cols-2">
          <Input name="base" label="Base delivery fee (DKK)" defaultValue="350" />
          <Input name="perKm" label="Per km (DKK)" defaultValue="12" />
          <Input name="freeRadius" label="Free radius (km)" defaultValue="5" />
          <Input name="maxRadius" label="Max radius (km)" defaultValue="60" />
        </Card>
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Zones</h2>
          {[
            ["Zone A · City", "0–15 km · 350 DKK"],
            ["Zone B · Metro", "15–35 km · 550 DKK"],
            ["Zone C · Region", "35–60 km · 850 DKK"],
          ].map(([name, detail]) => (
            <div key={name} className="flex justify-between rounded-lg bg-muted px-3 py-2 text-sm">
              <span className="font-medium">{name}</span>
              <span className="text-muted-foreground">{detail}</span>
            </div>
          ))}
          <Button className="mt-2">Save delivery settings</Button>
        </Card>
      </div>
    </main>
  );
}
