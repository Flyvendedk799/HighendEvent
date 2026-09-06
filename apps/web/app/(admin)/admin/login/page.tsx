"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Input } from "@rentora/ui";

function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("owner@demo.rentora.local");
  const [password, setPassword] = useState("demo1234");
  const [tenantSlug, setTenantSlug] = useState("demo");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "staff", tenantSlug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : "Login failed");
        return;
      }
      router.replace(params.get("next") || "/admin");
      router.refresh();
    } catch {
      setError("Could not reach login service");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md space-y-6 p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Rentora</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Staff login</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to manage catalog, bookings, and store settings.
        </p>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input
          label="Tenant slug"
          name="tenantSlug"
          value={tenantSlug}
          onChange={(e) => setTenantSlug(e.target.value)}
          required
        />
        <Input
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </Card>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Suspense fallback={<Card className="w-full max-w-md p-8 text-sm text-muted-foreground">Loading…</Card>}>
        <AdminLoginForm />
      </Suspense>
    </main>
  );
}
