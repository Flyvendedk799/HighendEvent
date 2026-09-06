"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge, Button, Card, Input, Select } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { clientApi } from "@/lib/client-api";

type StaffRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt?: string | null;
};

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("STAFF");
  const [busy, setBusy] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const rows = await clientApi<StaffRow[]>("/staff");
      setStaff(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load staff");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setInviteResult(null);
    setError(null);
    try {
      const res = await clientApi<{
        email: string;
        invite: { temporaryPassword: string; acceptUrl: string };
      }>("/staff/invite", {
        method: "POST",
        body: JSON.stringify({ email, name: name || undefined, role }),
      });
      setInviteResult(
        `Invited ${res.email}. Temporary password: ${res.invite.temporaryPassword}`,
      );
      setEmail("");
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <PageHeader
        title="Staff"
        description="Invite teammates and assign role-based access."
      />
      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
      {inviteResult ? (
        <p className="mb-4 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
          {inviteResult}
        </p>
      ) : null}

      <Card className="mb-6 space-y-3 p-4">
        <h2 className="font-medium">Invite staff</h2>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={onInvite}>
          <Input
            required
            type="email"
            label="Email"
            placeholder="email@company.com"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
          />
          <Input
            label="Name"
            placeholder="Name"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
          />
          <Select label="Role" value={role} onChange={(ev) => setRole(ev.target.value)}>
            <option value="MANAGER">MANAGER</option>
            <option value="STAFF">STAFF</option>
            <option value="READONLY">READONLY</option>
          </Select>
          <div className="flex items-end">
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Inviting…" : "Invite"}
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {staff.length === 0 ? (
          <p className="text-sm text-muted-foreground">No staff yet.</p>
        ) : (
          staff.map((s) => (
            <Card
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <h2 className="font-medium">{s.name || s.email}</h2>
                <p className="text-sm text-muted-foreground">{s.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={s.role === "OWNER" ? "accent" : "neutral"}>{s.role}</Badge>
                <Badge tone={s.isActive ? "success" : "neutral"}>
                  {s.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
