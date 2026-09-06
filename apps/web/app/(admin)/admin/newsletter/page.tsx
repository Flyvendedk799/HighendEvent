"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { clientApi } from "@/lib/client-api";

type Subscriber = {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  confirmedAt: string | null;
};

export default function AdminNewsletterPage() {
  const [rows, setRows] = useState<Subscriber[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setRows(await clientApi<Subscriber[]>("/newsletter"));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load subscribers");
      }
    })();
  }, []);

  function exportCsv() {
    const header = "email,active,createdAt\n";
    const body = rows
      .map((r) => `${r.email},${r.isActive},${r.createdAt}`)
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "newsletter-subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const active = rows.filter((r) => r.isActive).length;

  return (
    <main>
      <PageHeader
        title="Newsletter"
        description="Subscriber list from the public storefront signup."
        action={
          <Button variant="secondary" onClick={exportCsv} disabled={rows.length === 0}>
            Export CSV
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Subscribers</p>
          <p className="mt-2 font-display text-3xl font-semibold">{rows.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Active</p>
          <p className="mt-2 font-display text-3xl font-semibold">{active}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Inactive</p>
          <p className="mt-2 font-display text-3xl font-semibold">{rows.length - active}</p>
        </Card>
      </div>
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      <Card className="overflow-x-auto p-0">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No subscribers yet.</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium">{r.email}</td>
                  <td className="px-4 py-3">{r.isActive ? "Active" : "Unsubscribed"}</td>
                  <td className="px-4 py-3">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </main>
  );
}
