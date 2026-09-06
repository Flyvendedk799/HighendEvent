"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Input } from "@rentora/ui";

function PlatformLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("admin@rentora.app");
  const [password, setPassword] = useState("admin123");
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
        body: JSON.stringify({ email, password, role: "platform" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : "Login failed");
        return;
      }
      router.replace(params.get("next") || "/platform");
      router.refresh();
    } catch {
      setError("Could not reach login service");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md space-y-6 border-slate-700 bg-slate-900 p-8 text-white">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
          Rentora Platform
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Admin login</h1>
        <p className="mt-2 text-sm text-slate-300">Manage tenants, plans, and platform health.</p>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
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
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </Card>
  );
}

export default function PlatformLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <Suspense fallback={<Card className="w-full max-w-md p-8 text-sm text-slate-300">Loading…</Card>}>
        <PlatformLoginForm />
      </Suspense>
    </main>
  );
}
