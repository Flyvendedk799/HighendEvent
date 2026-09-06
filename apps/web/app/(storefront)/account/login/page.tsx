"use client";

import Link from "next/link";
import { Button, Card, Input } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

export default function CustomerLoginPage() {
  return (
    <main className="mx-auto max-w-md">
      <PageHeader title="Customer login" description="Access your bookings and invoices." />
      <Card className="space-y-4">
        <Input name="email" type="email" label="Email" placeholder="you@example.com" />
        <Input name="password" type="password" label="Password" />
        <Link href="/account/dashboard">
          <Button className="w-full">Log in</Button>
        </Link>
        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/account/register" className="text-primary hover:underline">
            Register
          </Link>
        </p>
      </Card>
    </main>
  );
}
