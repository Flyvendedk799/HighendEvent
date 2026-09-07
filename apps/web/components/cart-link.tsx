import Link from "next/link";
import { readCart } from "@/lib/actions/cart";

/**
 * Reads the real server cart. The count is whatever the API says is in it, not a number kept in
 * browser storage that can disagree with checkout.
 */
export async function CartLink({ label }: { label: string }) {
  const { itemCount } = await readCart();

  return (
    <Link
      href="/cart"
      className="relative rounded-lg px-3 py-1.5 hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
    >
      {label}
      {itemCount > 0 ? (
        <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
          {itemCount}
        </span>
      ) : null}
    </Link>
  );
}
