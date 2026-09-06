import Link from "next/link";
import { Badge } from "@rentora/ui";
import { formatMoney } from "@/lib/money";

export type ProductCardModel = {
  id: string;
  name: string;
  slug: string;
  description: string;
  dailyPriceMinor: number;
  currency: string;
  stockQty: number;
  category: string;
  imageUrl?: string | null;
};

const tones = [
  "from-teal-700 to-teal-500",
  "from-amber-600 to-amber-400",
  "from-slate-700 to-slate-500",
];

export function ProductCard({ product }: { product: ProductCardModel }) {
  const tone = tones[product.name.length % tones.length]!;
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-xl"
    >
      <div
        className={`relative aspect-[4/3] bg-gradient-to-br ${tone}`}
        style={
          product.imageUrl
            ? {
                backgroundImage: `url(${product.imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <Badge className="absolute left-3 top-3" tone="accent">
          {product.category}
        </Badge>
        <div className="absolute bottom-3 right-3 rounded-lg bg-black/35 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {product.stockQty} in stock
        </div>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="font-display text-lg font-semibold group-hover:text-primary">
          {product.name}
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        <div className="flex items-end justify-between gap-3 pt-1">
          <p className="text-sm font-medium text-foreground">
            From {formatMoney(product.dailyPriceMinor, product.currency)}
            <span className="text-muted-foreground"> / day</span>
          </p>
          <span className="text-xs font-semibold text-teal-800 opacity-0 transition group-hover:opacity-100">
            Check dates →
          </span>
        </div>
      </div>
    </Link>
  );
}
