import { Badge } from "@rentora/ui";
import { formatPrice, type DemoProduct } from "@/lib/demo-data";
import Link from "next/link";

const tones = {
  teal: "from-teal-700 to-teal-500",
  amber: "from-amber-600 to-amber-400",
  slate: "from-slate-700 to-slate-500",
};

export function ProductCard({ product }: { product: DemoProduct }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-xl"
    >
      <div className={`aspect-[4/3] bg-gradient-to-br ${tones[product.imageTone]} relative`}>
        <div className="absolute inset-0 opacity-30 mix-blend-overlay [background-image:radial-gradient(circle_at_30%_20%,white,transparent_45%)]" />
        <Badge className="absolute left-3 top-3" tone="accent">
          {product.category}
        </Badge>
        <div className="absolute bottom-3 right-3 rounded-lg bg-black/35 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {product.stock} in stock
        </div>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="font-display text-lg font-semibold group-hover:text-primary">
          {product.name}
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        <div className="flex items-end justify-between gap-3 pt-1">
          <p className="text-sm font-medium text-foreground">
            From {formatPrice(product.priceFrom, product.currency)}
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
