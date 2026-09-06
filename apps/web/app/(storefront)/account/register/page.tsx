"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { clientApi, getClientTenantSlug } from "@/lib/client-api";

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const tenantSlug = getClientTenantSlug();
    try {
      await clientApi("/customers", {
        method: "POST",
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          password,
          isGuest: false,
        }),
        tenantSlug,
      });
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          role: "customer",
          tenantSlug,
        }),
      });
      const data = await loginRes.json().catch(() => ({}));
      if (!loginRes.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Account created but login failed — try signing in.",
        );
        return;
      }
      router.replace("/account/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md">
      <PageHeader title="Create account" description="Save bookings and speed up checkout." />
      <Card>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Input
            name="firstName"
            label="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <Input
            name="lastName"
            label="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
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
            minLength={6}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link href="/account/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </main>
  );
}
