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
      className="flex items-center gap-2 border border-line-strong px-3.5 py-2 transition-colors duration-instant hover:border-signal hover:text-signal"
    >
      {label}
      <span
        className={
          itemCount > 0
            ? "tabular-nums text-signal"
            : "tabular-nums text-paper-ghost"
        }
      >
        {itemCount}
      </span>
    </Link>
  );
}
