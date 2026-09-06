"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge, Button, Card, Input, Textarea } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { clientApi } from "@/lib/client-api";

type CmsPage = {
  id: string;
  slug: string;
  title: string;
  locale: string;
  isPublished: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  sections: unknown;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminCmsPage() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<CmsPage | null>(null);

  async function load() {
    try {
      setPages(await clientApi<CmsPage[]>("/cms/pages"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load CMS pages");
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
    const title = String(fd.get("title") || "");
    const body = {
      title,
      slug: String(fd.get("slug") || "") || slugify(title),
      locale: String(fd.get("locale") || "en"),
      seoTitle: String(fd.get("seoTitle") || "") || undefined,
      seoDescription: String(fd.get("seoDescription") || "") || undefined,
      isPublished: fd.get("isPublished") === "on",
      sections: [
        {
          type: "richtext",
          html: String(fd.get("bodyHtml") || ""),
        },
      ],
    };
    try {
      if (editing) {
        await clientApi(`/cms/pages/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        setMessage("Page updated");
      } else {
        await clientApi("/cms/pages", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setMessage("Page created");
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
    if (!window.confirm("Delete this page?")) return;
    setBusy(true);
    try {
      await clientApi(`/cms/pages/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  const bodyHtml =
    editing &&
    Array.isArray(editing.sections) &&
    editing.sections[0] &&
    typeof editing.sections[0] === "object" &&
    editing.sections[0] !== null &&
    "html" in editing.sections[0]
      ? String((editing.sections[0] as { html: string }).html)
      : "";

  return (
    <main>
      <PageHeader
        title="CMS pages"
        description="Editable content for About, FAQ, Terms, and more."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <form className="space-y-3" onSubmit={onSave} key={editing?.id ?? "new"}>
            <Input name="title" label="Title" required defaultValue={editing?.title ?? ""} />
            <Input name="slug" label="Slug" defaultValue={editing?.slug ?? ""} placeholder="about" />
            <Input name="locale" label="Locale" defaultValue={editing?.locale ?? "en"} />
            <Input name="seoTitle" label="SEO title" defaultValue={editing?.seoTitle ?? ""} />
            <Input
              name="seoDescription"
              label="SEO description"
              defaultValue={editing?.seoDescription ?? ""}
            />
            <Textarea name="bodyHtml" label="Body HTML" rows={8} defaultValue={bodyHtml} />
            <label className="flex items-center gap-2 text-sm">
              <input name="isPublished" type="checkbox" defaultChecked={editing?.isPublished ?? true} />
              Published
            </label>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {editing ? "Update page" : "Create page"}
              </Button>
              {editing ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
          {message ? <p className="mt-3 text-sm text-teal-700">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </Card>
        <div className="space-y-3">
          {pages.length === 0 ? (
            <Card className="p-6 text-sm text-slate-500">No CMS pages yet.</Card>
          ) : (
            pages.map((p) => (
              <Card key={p.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-medium">{p.title}</h2>
                  <p className="text-sm text-slate-500">
                    /p/{p.slug} · {p.locale}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={p.isPublished ? "success" : "warning"}>
                    {p.isPublished ? "Published" : "Draft"}
                  </Badge>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => setEditing(p)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => remove(p.id)}>
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
