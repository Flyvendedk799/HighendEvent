"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export function CartLink({ label }: { label: string }) {
  const { count } = useCart();

  return (
    <Link href="/cart" className="relative hover:text-foreground">
      {label}
      {count > 0 ? (
        <span className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
