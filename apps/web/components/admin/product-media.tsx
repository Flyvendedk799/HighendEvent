"use client";

import { useState, useTransition } from "react";
import {
  Banner,
  Button,
  Card,
  CardHeader,
  EmptyState,
  FileDropzone,
  Input,
  useToast,
} from "@rentora/ui";
import {
  addProductImageAction,
  deleteProductImageAction,
  setPrimaryImageAction,
  updateProductImageAction,
} from "@/lib/actions/catalog";
import { createUploadTicketAction, type StorageStatus } from "@/lib/actions/media";
import type { ProductImage } from "@/lib/types";

export function ProductMedia({
  productId,
  images,
  storage,
}: {
  productId: string;
  images: ProductImage[];
  storage: StorageStatus;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState("");

  function run(work: () => Promise<{ error?: string }>, successMessage: string) {
    startTransition(async () => {
      const result = await work();
      if (result.error) {
        setError(result.error);
        toast({ title: "Could not save", description: result.error, tone: "error" });
      } else {
        setError(null);
        toast({ title: successMessage });
      }
    });
  }

  async function uploadFiles(files: File[]) {
    setError(null);
    for (const file of files) {
      setUploading((current) => [...current, file.name]);
      try {
        const { ticket, error: ticketError } = await createUploadTicketAction({
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          alt: file.name.replace(/\.[^.]+$/, ""),
        });

        if (ticketError || !ticket) {
          throw new Error(ticketError ?? "Could not start the upload");
        }

        const response = await fetch(ticket.uploadUrl, {
          method: ticket.method,
          headers: ticket.headers,
          body: file,
        });
        if (!response.ok) {
          throw new Error(`Storage rejected the upload (${response.status})`);
        }

        const result = await addProductImageAction(productId, {
          url: ticket.url,
          alt: file.name.replace(/\.[^.]+$/, ""),
        });
        if (result.error) throw new Error(result.error);

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
    run(
      () => addProductImageAction(productId, { url, alt: "" }),
      "Image added",
    );
    setExternalUrl("");
  }

  return (
    <div className="space-y-6">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      <Card>
        <CardHeader
          title="Photos"
          description="The first photo is the one shoppers see in the catalog."
        />

        {images.length === 0 ? (
          <EmptyState
            title="No photos yet"
            description="Products with photos get booked. Add at least one wide shot of the item set up."
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image, index) => (
              <li
                key={image.id}
                className="group relative overflow-hidden border border-line"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.alt}
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                />
                {index === 0 ? (
                  <span className="absolute left-2 top-2 bg-ink/85 px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-paper">
                    Primary
                  </span>
                ) : null}
                <div className="space-y-2 p-2">
                  <Input
                    aria-label="Alt text"
                    defaultValue={image.alt}
                    placeholder="Describe the photo"
                    className="h-8 text-[11.5px]"
                    onBlur={(e) => {
                      const alt = e.target.value.trim();
                      if (alt !== image.alt) {
                        run(
                          () => updateProductImageAction(productId, image.id, { alt }),
                          "Alt text saved",
                        );
                      }
                    }}
                  />
                  <div className="flex gap-1">
                    {index !== 0 ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => setPrimaryImageAction(productId, image.id),
                            "Primary photo updated",
                          )
                        }
                      >
                        Make primary
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => deleteProductImageAction(productId, image.id),
                          "Photo removed",
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Add photos" />

        {storage.configured ? (
          <FileDropzone
            onFiles={uploadFiles}
            accept={storage.allowedTypes.join(",")}
            maxBytes={storage.maxBytes}
            onReject={(reason) => setError(reason)}
            disabled={uploading.length > 0}
            hint={`JPG, PNG, WebP or AVIF up to ${Math.round(storage.maxBytes / 1024 / 1024)} MB.`}
          />
        ) : (
          <Banner tone="info" title="File uploads are not switched on">
            {storage.reason} In the meantime you can point at an image you already host.
          </Banner>
        )}

        {uploading.length > 0 ? (
          <p className="mt-2 font-mono text-[11px] text-paper-faint">
            Uploading {uploading.join(", ")}…
          </p>
        ) : null}

        <div className="mt-4 flex items-end gap-2">
          <Input
            label="Or paste an image URL"
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
    </div>
  );
}
