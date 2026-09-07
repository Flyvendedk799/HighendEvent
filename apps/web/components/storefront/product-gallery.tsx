"use client";

import { useState } from "react";
import { cx, focusRing } from "@rentora/ui";
import type { ProductImage } from "@/lib/types";

export function ProductGallery({
  images,
  name,
  /** Overlaid top-left of the main image — how many units are free on the chosen dates. */
  overlay,
}: {
  images: ProductImage[];
  name: string;
  overlay?: React.ReactNode;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="relative flex aspect-[16/10] items-center justify-center border border-line bg-ink-raised plate">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper-ghost">
          No photos yet
        </span>
        {overlay ? <div className="absolute left-3.5 top-3.5">{overlay}</div> : null}
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)]!;

  return (
    <div className="border border-line bg-ink-raised">
      {/* Tenant images live on arbitrary hosts, so these stay plain img elements. */}
      {/* eslint-disable @next/next/no-img-element */}
      <div className="relative">
        <img
          src={current.url}
          alt={current.alt || name}
          className="aspect-[16/10] w-full object-cover"
        />
        {overlay ? <div className="absolute left-3.5 top-3.5">{overlay}</div> : null}
      </div>

      {images.length > 1 ? (
        <ul className="grid gap-px border-t border-line bg-line [grid-template-columns:repeat(auto-fit,minmax(88px,1fr))]">
          {images.map((image, index) => (
            <li key={image.id} className="bg-ink-sunk">
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show photo ${index + 1}`}
                aria-current={index === active}
                className={cx(
                  "block w-full transition-opacity duration-instant",
                  focusRing,
                  index === active
                    ? "outline outline-1 -outline-offset-1 outline-signal"
                    : "opacity-60 hover:opacity-100",
                )}
              >
                <img src={image.url} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {/* eslint-enable @next/next/no-img-element */}
    </div>
  );
}
