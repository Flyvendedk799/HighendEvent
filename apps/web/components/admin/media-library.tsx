"use client";

import { useState, useTransition } from "react";
import {
  Banner,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  FileDropzone,
  Input,
  useToast,
} from "@rentora/ui";
import {
  createUploadTicketAction,
  deleteMediaAction,
  registerExternalMediaAction,
  type MediaAsset,
  type StorageStatus,
} from "@/lib/actions/media";

export function MediaLibrary({
  assets,
  storage,
}: {
  assets: MediaAsset[];
  storage: StorageStatus;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState("");

  async function uploadFiles(files: File[]) {
    setError(null);
    for (const file of files) {
      setUploading((current) => [...current, file.name]);
      try {
        const { ticket, error: ticketError } = await createUploadTicketAction({
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        });
        if (ticketError || !ticket) throw new Error(ticketError ?? "Could not start the upload");

        const response = await fetch(ticket.uploadUrl, {
          method: ticket.method,
          headers: ticket.headers,
          body: file,
        });
        if (!response.ok) throw new Error(`Storage rejected the upload (${response.status})`);

        toast({ title: `Uploaded ${file.name}` });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        toast({ title: "Upload failed", description: message, tone: "error" });
      } finally {
        setUploading((current) => current.filter((name) => name !== file.name));
      }
    }
  }

  function addExternal() {
    const url = externalUrl.trim();
    if (!url) return;
    startTransition(async () => {
      const result = await registerExternalMediaAction({ url });
      if (result.error) {
        setError(result.error);
        toast({ title: "Could not add", description: result.error, tone: "error" });
      } else {
        setExternalUrl("");
        toast({ title: "Image added to your library" });
      }
    });
  }

  return (
    <div className="space-y-6">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      <Card>
        <CardHeader title="Add media" />
        {storage.configured ? (
          <FileDropzone
            onFiles={uploadFiles}
            accept={storage.allowedTypes.join(",")}
            maxBytes={storage.maxBytes}
            onReject={setError}
            disabled={uploading.length > 0}
            hint={`Up to ${Math.round(storage.maxBytes / 1024 / 1024)} MB per file. Stored in ${storage.bucket}.`}
          />
        ) : (
          <Banner tone="info" title="File uploads are not switched on">
            {storage.reason}
          </Banner>
        )}

        {uploading.length > 0 ? (
          <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
            Uploading {uploading.join(", ")}…
          </p>
        ) : null}

        <div className="mt-4 flex items-end gap-2">
          <Input
            label="Or reference an image you already host"
            placeholder="https://…"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            className="h-9"
          />
          <Button variant="secondary" disabled={pending || !externalUrl.trim()} onClick={addExternal}>
            Add
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Library"
          description={`${assets.length} file${assets.length === 1 ? "" : "s"}`}
        />
        {assets.length === 0 ? (
          <EmptyState
            title="Nothing in your library yet"
            description="Photos you upload here can be reused across products and CMS pages."
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {assets.map((asset) => (
              <li
                key={asset.id}
                className="overflow-hidden rounded-lg border border-[var(--color-border)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.url}
                  alt={asset.alt ?? ""}
                  className="aspect-square w-full bg-[var(--color-muted)] object-cover"
                  loading="lazy"
                />
                <div className="flex items-center justify-between gap-1 p-2">
                  <span className="truncate text-[11px] text-[var(--color-muted-foreground)]">
                    {asset.alt || asset.key.split("/").pop()}
                  </span>
                  <DeleteAsset asset={asset} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function DeleteAsset({ asset }: { asset: MediaAsset }) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="ghost" className="h-6 px-1 text-red-600">
          Delete
        </Button>
      }
      title="Delete this file?"
      description="Files still used by a product image cannot be deleted until they are removed there."
      confirmLabel="Delete"
      destructive
      onConfirm={() =>
        startTransition(async () => {
          const result = await deleteMediaAction(asset.id);
          toast(
            result.error
              ? { title: "Could not delete", description: result.error, tone: "error" }
              : { title: "File deleted" },
          );
        })
      }
    />
  );
}
