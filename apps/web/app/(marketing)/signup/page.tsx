"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Select } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      tenantName: String(fd.get("tenantName") || ""),
      slug: String(fd.get("slug") || "").toLowerCase(),
      storeName: String(fd.get("storeName") || ""),
      ownerName: String(fd.get("ownerName") || ""),
      ownerEmail: String(fd.get("ownerEmail") || ""),
      ownerPassword: String(fd.get("ownerPassword") || ""),
      plan: String(fd.get("plan") || "STARTER"),
      currency: String(fd.get("currency") || "USD"),
      country: String(fd.get("country") || "US"),
    };

    try {
      const res = await fetch(`${API_URL}/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = Array.isArray(data?.message)
          ? data.message.join(", ")
          : data?.message || `Signup failed (${res.status})`;
        throw new Error(message);
      }
      router.push(
        `/admin/login?slug=${encodeURIComponent(payload.slug)}&email=${encodeURIComponent(payload.ownerEmail)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <PageHeader
        title="Start your Rentora trial"
        description="Create a tenant, storefront, and owner account in one step."
      />
      <Card>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Input name="tenantName" label="Company name" required placeholder="Nordic Party Co." />
          <Input
            name="slug"
            label="Store slug"
            required
            pattern="[a-z0-9-]+"
            placeholder="nordic-party"
            hint="Used as nordic-party.localhost and in admin."
          />
          <Input name="storeName" label="Storefront name" required placeholder="Nordic Party Hire" />
          <Input name="ownerName" label="Your name" required />
          <Input name="ownerEmail" type="email" label="Work email" required />
          <Input name="ownerPassword" type="password" label="Password" required minLength={6} />
          <Select name="plan" label="Plan" defaultValue="STARTER">
            <option value="STARTER">Starter</option>
            <option value="GROWTH">Growth</option>
            <option value="SCALE">Scale</option>
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="currency" label="Currency" defaultValue="USD" />
            <Input name="country" label="Country" defaultValue="US" />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/admin/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
