"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge, Button, Card, Input } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { clientApi } from "@/lib/client-api";

type Location = {
  id: string;
  name: string;
  address: string;
  zipCode: string;
  city: string;
  country: string;
  isPrimary: boolean;
  isActive: boolean;
};

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setLocations(await clientApi<Location[]>("/locations"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load locations");
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
      await clientApi("/locations", {
        method: "POST",
        body: JSON.stringify({
          name: String(fd.get("name") || ""),
          address: String(fd.get("address") || ""),
          zipCode: String(fd.get("zipCode") || ""),
          city: String(fd.get("city") || ""),
          country: String(fd.get("country") || "DK"),
          isPrimary: fd.get("isPrimary") === "on",
        }),
      });
      setMessage("Location created");
      e.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this location?")) return;
    setBusy(true);
    try {
      await clientApi(`/locations/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <PageHeader
        title="Locations"
        description="Warehouses, pickup points, and return desks."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <form className="space-y-3" onSubmit={onCreate}>
            <Input name="name" label="Name" required placeholder="Copenhagen Warehouse" />
            <Input name="address" label="Address" required />
            <Input name="zipCode" label="Zip" required />
            <Input name="city" label="City" required />
            <Input name="country" label="Country" defaultValue="DK" />
            <label className="flex items-center gap-2 text-sm">
              <input name="isPrimary" type="checkbox" />
              Primary location
            </label>
            <Button type="submit" disabled={busy}>
              Add location
            </Button>
          </form>
          {message ? <p className="mt-3 text-sm text-teal-700">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </Card>
        <div className="grid gap-3 md:grid-cols-2">
          {locations.length === 0 ? (
            <Card className="md:col-span-2 p-6 text-sm text-slate-500">No locations yet.</Card>
          ) : (
            locations.map((l) => (
              <Card key={l.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold">{l.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {l.address}, {l.zipCode} {l.city}
                    </p>
                  </div>
                  <Badge tone={l.isPrimary ? "success" : "neutral"}>
                    {l.isPrimary ? "Primary" : "Secondary"}
                  </Badge>
                </div>
                <Button
                  className="mt-4"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => remove(l.id)}
                >
                  Delete
                </Button>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
