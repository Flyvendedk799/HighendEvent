"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, Input } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { clientApi } from "@/lib/client-api";

type MediaAsset = {
  id: string;
  url: string;
  key: string;
  mimeType: string | null;
  alt: string | null;
  createdAt: string;
};

export default function AdminMediaPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setAssets(await clientApi<MediaAsset[]>("/media"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load media");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    try {
      await clientApi("/media/upload", {
        method: "POST",
        body: JSON.stringify({
          filename: String(fd.get("filename") || "upload.jpg"),
          mimeType: String(fd.get("mimeType") || "image/jpeg"),
          alt: String(fd.get("alt") || "") || undefined,
        }),
      });
      setMessage("Media asset registered (signed upload stub until R2 credentials are set).");
      e.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <PageHeader
        title="Media"
        description="Tenant media library. Upload uses a stubbed CDN URL until object storage is configured."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <form className="space-y-3" onSubmit={onUpload}>
            <Input name="filename" label="Filename" required placeholder="marquee-hero.jpg" />
            <Input name="mimeType" label="MIME type" defaultValue="image/jpeg" />
            <Input name="alt" label="Alt text" />
            <Button type="submit" disabled={busy}>
              Register upload
            </Button>
          </form>
          {message ? <p className="mt-3 text-sm text-teal-700">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </Card>
        <div className="grid gap-3 sm:grid-cols-2">
          {assets.length === 0 ? (
            <Card className="sm:col-span-2 p-6 text-sm text-slate-500">No media assets yet.</Card>
          ) : (
            assets.map((a) => (
              <Card key={a.id}>
                <div className="aspect-video overflow-hidden rounded-md bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt={a.alt ?? a.key} className="h-full w-full object-cover" />
                </div>
                <p className="mt-2 truncate text-sm font-medium">{a.alt || a.key}</p>
                <a href={a.url} className="text-xs text-teal-800 hover:underline" target="_blank" rel="noreferrer">
                  Open URL
                </a>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
