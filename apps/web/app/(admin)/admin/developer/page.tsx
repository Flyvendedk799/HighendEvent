"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge, Button, Card, Input } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { clientApi } from "@/lib/client-api";

type ApiKeyRow = {
  id: string;
  name: string;
  isActive: boolean;
  lastUsedAt?: string | null;
  createdAt: string;
};

export default function AdminDeveloperPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [name, setName] = useState("Default");
  const [busy, setBusy] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const rows = await clientApi<ApiKeyRow[]>("/developer/api-keys");
      setKeys(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load API keys");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setCreatedKey(null);
    setError(null);
    try {
      const res = await clientApi<{ apiKey: string }>("/developer/api-keys", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setCreatedKey(res.apiKey);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    try {
      await clientApi(`/developer/api-keys/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <PageHeader
        title="Developer"
        description="API keys for Scale-plan integrations (shown once on create)."
      />
      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
      {createdKey ? (
        <p className="mb-4 break-all rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          New API key (copy now): {createdKey}
        </p>
      ) : null}

      <Card className="mb-6 space-y-3 p-4">
        <form className="flex flex-wrap items-end gap-3" onSubmit={onCreate}>
          <Input label="Key name" value={name} onChange={(ev) => setName(ev.target.value)} />
          <Button type="submit" disabled={busy}>
            Create API key
          </Button>
        </form>
      </Card>

      <div className="space-y-3">
        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No API keys yet.</p>
        ) : (
          keys.map((k) => (
            <Card
              key={k.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <h2 className="font-medium">{k.name}</h2>
                <p className="text-sm text-muted-foreground">
                  Created {new Date(k.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={k.isActive ? "success" : "neutral"}>
                  {k.isActive ? "Active" : "Revoked"}
                </Badge>
                {k.isActive ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void revoke(k.id)}
                  >
                    Revoke
                  </Button>
                ) : null}
              </div>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
