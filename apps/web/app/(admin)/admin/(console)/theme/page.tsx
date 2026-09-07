"use client";

import { Button, Card, Input } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

export default function AdminThemePage() {
  return (
    <main>
      <PageHeader
        title="Theme editor"
        description="Brand colors and typography mapped to CSS variables."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <Input name="primary" label="Primary" defaultValue="#0F766E" />
          <Input name="accent" label="Accent" defaultValue="#F59E0B" />
          <Input name="background" label="Background" defaultValue="#F8FAFC" />
          <Input name="displayFont" label="Display font" defaultValue="Fraunces" />
          <Input name="bodyFont" label="Body font" defaultValue="DM Sans" />
          <Button>Publish theme</Button>
        </Card>
        <Card className="overflow-hidden p-0">
          <div className="bg-hero-glow p-8 text-white">
            <p className="font-display text-3xl font-semibold">Preview</p>
            <p className="mt-2 text-sm text-teal-50/80">Storefront hero with live tokens.</p>
            <button className="mt-6 rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-slate-950">
              Browse catalog
            </button>
          </div>
          <div className="space-y-3 p-6">
            <div className="h-3 w-2/3 rounded bg-slate-200" />
            <div className="h-3 w-1/2 rounded bg-slate-100" />
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="aspect-square rounded-xl bg-teal-600/80" />
              <div className="aspect-square rounded-xl bg-amber-500/80" />
              <div className="aspect-square rounded-xl bg-slate-500/80" />
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
