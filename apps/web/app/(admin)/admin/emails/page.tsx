"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge, Button, Card, Input, Textarea } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { clientApi } from "@/lib/client-api";

type EmailTemplate = {
  id: string;
  key: string;
  locale: string;
  subject: string;
  bodyHtml: string;
  isActive: boolean;
};

export default function AdminEmailsPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);

  async function load() {
    try {
      setTemplates(await clientApi<EmailTemplate[]>("/email-templates"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load templates");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      key: String(fd.get("key") || ""),
      locale: String(fd.get("locale") || "en"),
      subject: String(fd.get("subject") || ""),
      bodyHtml: String(fd.get("bodyHtml") || ""),
      isActive: fd.get("isActive") === "on",
    };
    try {
      if (editing) {
        await clientApi(`/email-templates/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        setMessage("Template updated");
      } else {
        await clientApi("/email-templates", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setMessage("Template created");
      }
      setEditing(null);
      e.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this template?")) return;
    setBusy(true);
    try {
      await clientApi(`/email-templates/${id}`, { method: "DELETE" });
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
        title="Email templates"
        description="Transactional messages rendered by the worker."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <form className="space-y-3" onSubmit={onSave} key={editing?.id ?? "new"}>
            <Input
              name="key"
              label="Key"
              required
              defaultValue={editing?.key ?? "booking_confirmation"}
              placeholder="booking_confirmation"
            />
            <Input name="locale" label="Locale" defaultValue={editing?.locale ?? "en"} />
            <Input name="subject" label="Subject" required defaultValue={editing?.subject ?? ""} />
            <Textarea
              name="bodyHtml"
              label="HTML body"
              rows={10}
              required
              defaultValue={editing?.bodyHtml ?? "<p>Hello {{customerName}}</p>"}
            />
            <label className="flex items-center gap-2 text-sm">
              <input name="isActive" type="checkbox" defaultChecked={editing?.isActive ?? true} />
              Active
            </label>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {editing ? "Update template" : "Create template"}
              </Button>
              {editing ? (
                <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
          {message ? <p className="mt-3 text-sm text-teal-700">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </Card>
        <div className="space-y-3">
          {templates.length === 0 ? (
            <Card className="p-6 text-sm text-slate-500">No templates yet.</Card>
          ) : (
            templates.map((t) => (
              <Card key={t.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-medium">{t.subject}</h2>
                  <p className="text-sm text-slate-500">
                    {t.key} · {t.locale}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={t.isActive ? "success" : "warning"}>
                    {t.isActive ? "Active" : "Draft"}
                  </Badge>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => setEditing(t)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => remove(t.id)}>
                    Delete
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
