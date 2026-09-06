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
      className="group block overflow-hidden rounded-2xl border border-border bg-surface transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div
        className={`aspect-[4/3] bg-gradient-to-br ${tones[product.imageTone]} relative`}
      >
        <div className="absolute inset-0 opacity-30 mix-blend-overlay [background-image:radial-gradient(circle_at_30%_20%,white,transparent_45%)]" />
        <Badge className="absolute left-3 top-3" tone="accent">
          {product.category}
        </Badge>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="font-display text-lg font-semibold group-hover:text-primary">
          {product.name}
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        <p className="text-sm font-medium text-foreground">
          From {formatPrice(product.priceFrom, product.currency)}
          <span className="text-muted-foreground"> / day</span>
        </p>
      </div>
    </Link>
  );
}
