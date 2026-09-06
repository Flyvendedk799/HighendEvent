"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Input } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { getClientTenantSlug } from "@/lib/client-api";

function CustomerLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        body: JSON.stringify({
          email,
          password,
          role: "customer",
          tenantSlug: getClientTenantSlug(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : "Login failed");
        return;
      }
      router.replace(params.get("next") || "/account/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach login service");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md">
      <PageHeader title="Customer login" description="Access your bookings and account." />
      <Card>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Input
            name="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            name="password"
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Log in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/account/register" className="text-primary hover:underline">
            Register
          </Link>
        </p>
      </Card>
    </main>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-md p-6 text-sm text-slate-500">Loading…</main>}>
      <CustomerLoginForm />
    </Suspense>
  );
}
