"use client";

import { useState } from "react";
import { cx, focusRing } from "@rentora/ui";
import type { ProductImage } from "@/lib/types";

export function ProductGallery({
  images,
  name,
}: {
  images: ProductImage[];
  name: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-muted)] text-sm text-[var(--color-muted-foreground)]">
        No photos yet
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)]!;

  return (
    <div>
      {/* Tenant images live on arbitrary hosts, so these stay plain img elements. */}
      {/* eslint-disable @next/next/no-img-element */}
      <img
        src={current.url}
        alt={current.alt || name}
        className="aspect-[16/10] w-full rounded-2xl object-cover"
      />

      {images.length > 1 ? (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show photo ${index + 1}`}
                aria-current={index === active}
                className={cx(
                  "overflow-hidden rounded-lg border-2 transition",
                  focusRing,
                  index === active
                    ? "border-[var(--color-primary)]"
                    : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <img
                  src={image.url}
                  alt=""
                  className="h-16 w-20 object-cover"
                  loading="lazy"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {/* eslint-enable @next/next/no-img-element */}
    </div>
  );
}
