"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Input } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { clientApi } from "@/lib/client-api";

type Customer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  city: string | null;
  isGuest: boolean;
  isActive: boolean;
  createdAt: string;
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  async function load() {
    try {
      const rows = await clientApi<Customer[]>("/customers");
      setCustomers(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load customers");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    try {
      await clientApi("/customers", {
        method: "POST",
        body: JSON.stringify({
          email: String(fd.get("email") || ""),
          firstName: String(fd.get("firstName") || ""),
          lastName: String(fd.get("lastName") || ""),
          phone: String(fd.get("phone") || "") || undefined,
          city: String(fd.get("city") || "") || undefined,
          password: String(fd.get("password") || "") || undefined,
        }),
      });
      setMessage("Customer created");
      e.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(id: string) {
    setBusy(true);
    try {
      await clientApi(`/customers/${id}/deactivate`, { method: "PATCH" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deactivate failed");
    } finally {
      setBusy(false);
    }
  }

  async function exportGdpr(id: string) {
    setBusy(true);
    try {
      const data = await clientApi(`/gdpr/customers/${id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customer-${id}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  const filtered = customers.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.email.toLowerCase().includes(q) ||
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q)
    );
  });

  return (
    <main>
      <PageHeader
        title="Customers"
        description="CRM-lite view of renters and company accounts."
      />
      <div className="mb-4">
        <Input
          label="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or email"
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <form className="space-y-3" onSubmit={onCreate}>
            <Input name="firstName" label="First name" required />
            <Input name="lastName" label="Last name" required />
            <Input name="email" label="Email" type="email" required />
            <Input name="phone" label="Phone" />
            <Input name="city" label="City" />
            <Input name="password" label="Password (optional)" type="password" />
            <Button type="submit" disabled={busy}>
              Add customer
            </Button>
          </form>
          {message ? <p className="mt-3 text-sm text-teal-700">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </Card>
        <Card className="overflow-x-auto p-0">
          {filtered.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No customers found.</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/admin/customers/${c.id}`} className="hover:text-teal-800">
                        {c.firstName} {c.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{c.email}</td>
                    <td className="px-4 py-3">
                      <Badge tone={!c.isActive ? "neutral" : c.isGuest ? "warning" : "success"}>
                        {!c.isActive ? "Inactive" : c.isGuest ? "Guest" : "Active"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => exportGdpr(c.id)}>
                          Export
                        </Button>
                        {c.isActive ? (
                          <Button size="sm" variant="secondary" disabled={busy} onClick={() => deactivate(c.id)}>
                            Deactivate
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </main>
  );
}
