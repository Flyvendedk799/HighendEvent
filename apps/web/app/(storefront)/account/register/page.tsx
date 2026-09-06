"use client";

import Link from "next/link";
import { Button, Card, Input } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

export default function CustomerRegisterPage() {
  return (
    <main className="mx-auto max-w-md">
      <PageHeader title="Create account" description="Save bookings and speed up checkout." />
      <Card className="space-y-4">
        <Input name="name" label="Full name" placeholder="Maja Nielsen" />
        <Input name="email" type="email" label="Email" placeholder="you@example.com" />
        <Input name="password" type="password" label="Password" />
        <Link href="/account/dashboard">
          <Button className="w-full">Create account</Button>
        </Link>
        <p className="text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link href="/account/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </main>
  );
}
