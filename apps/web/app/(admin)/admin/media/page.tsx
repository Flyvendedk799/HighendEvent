"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, Input } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { clientApi } from "@/lib/client-api";
import { uploadMediaFile } from "@/lib/media-upload";

type MediaAsset = {
  id: string;
  url: string;
  key: string;
  mimeType: string | null;
  alt: string | null;
  createdAt: string;
};

type StorageStatus = {
  configured: boolean;
  provider: "r2" | "stub";
  publicBase: string;
};

export default function AdminMediaPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [list, status] = await Promise.all([
        clientApi<MediaAsset[]>("/media"),
        clientApi<StorageStatus>("/media/storage"),
      ]);
      setAssets(list);
      setStorage(status);
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
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = (fd.get("file") as File | null) ?? null;
    const alt = String(fd.get("alt") || "") || undefined;

    try {
      if (file && file.size > 0) {
        const result = await uploadMediaFile(file, { alt });
        setMessage(
          result.mode === "r2"
            ? "Uploaded to object storage and registered in the media library."
            : "Registered stub CDN asset (set R2_* env vars for real uploads).",
        );
      } else {
        const filename = String(fd.get("filename") || "").trim();
        if (!filename) throw new Error("Choose a file or enter a filename");
        await clientApi("/media/upload", {
          method: "POST",
          body: JSON.stringify({
            filename,
            mimeType: String(fd.get("mimeType") || "image/jpeg"),
            alt,
          }),
        });
        setMessage("Media asset registered (metadata-only stub).");
      }
      form.reset();
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
        description="Tenant media library with R2/S3 presigned uploads when configured."
      />
      <p className="mb-4 text-sm text-slate-600">
        Storage:{" "}
        <span className="font-medium text-slate-900">
          {storage ? (storage.provider === "r2" ? "Cloudflare R2 (live)" : "Stub CDN URLs") : "…"}
        </span>
        {storage ? ` · ${storage.publicBase}` : null}
      </p>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <form className="space-y-3" onSubmit={onUpload}>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Image file</span>
              <input
                name="file"
                type="file"
                accept="image/*"
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-teal-800 file:px-3 file:py-1.5 file:text-white"
              />
            </label>
            <Input name="alt" label="Alt text" />
            <details className="rounded-md border border-slate-200 p-3 text-sm">
              <summary className="cursor-pointer font-medium text-slate-700">
                Metadata-only (no file)
              </summary>
              <div className="mt-3 space-y-3">
                <Input name="filename" label="Filename" placeholder="marquee-hero.jpg" />
                <Input name="mimeType" label="MIME type" defaultValue="image/jpeg" />
              </div>
            </details>
            <Button type="submit" disabled={busy}>
              {busy ? "Uploading…" : "Upload"}
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
